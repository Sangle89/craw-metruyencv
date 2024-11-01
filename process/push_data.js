var fs = require("fs");
const { fetchWithRetry } = require("../lib/utils");
const { CRAWLER_HOST, TARGET_HOST } = require("../lib/config");

async function saveBook(book_slug, book, chapters) {
  const rpHtml = await fetch(TARGET_HOST + "/truyen/" + book_slug, [], 2);
  var html;

  if (rpHtml && rpHtml.status == 200) {
    html = await rpHtml.text();
  }

  try {
    const result = await fetchWithRetry(
      CRAWLER_HOST + "/api/v2/metruyencv/save-book",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          book,
          html,
          chapters,
        }),
      },
      3
    );

    return result;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function saveChapter(currentBookInfo, chapter) {
  const lstChapterLink = JSON.parse(
    await fs.readFileSync(
      "./source/" + currentBookInfo.slug + "/chapters.json",
      {
        encoding: "utf-8",
      }
    )
  );
  const itemIndex = chapter.index;
  const next =
    itemIndex < lstChapterLink.length - 1
      ? lstChapterLink[itemIndex + 1]
      : null;
  const prev = itemIndex > 0 ? lstChapterLink[itemIndex - 1] : null;
  const payload = {
    word_count: chapter.word_count,
    html: chapter.html,
    chapter: chapter.chapter,
    book: currentBookInfo,
    next: next ? { name: next.name, slug: next.slug } : null,
    prev: prev ? { name: prev.name, slug: prev.slug } : null,
  };
  const result = await fetchWithRetry(
    CRAWLER_HOST + "/api/v2/metruyencv/save-chapter",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    1
  );
  return result;
}

(async function run() {
  const books = fs.readdirSync("./source");
  let i = 0;
  while (i < books.length) {
    let j = 0;
    const book_slug = books[i];
    if (!fs.existsSync("./source/" + book_slug + "/book_saved.json")) {
      i++;
      continue;
    }
    console.log(book_slug);
    const chapters = fs
      .readdirSync("./source/" + book_slug)
      .filter(
        (item) =>
          ![
            "book.json",
            "chapters.json",
            "book_saved.json",
            "last_index.txt",
          ].includes(item)
      );
    const currentBookInfo = JSON.parse(
      await fs.readFileSync("./source/" + book_slug + "/book_saved.json", {
        encoding: "utf-8",
      })
    );
    const rawChapters = JSON.parse(
      await fs.readFileSync("./source/" + book_slug + "/chapters.json", {
        encoding: "utf-8",
      })
    );

    const newChapters = rawChapters.map((item) => ({
      ...item,
      ready: true,
    }));

    await saveBook(book_slug, currentBookInfo, newChapters);

    while (j < chapters.length) {
      const chapter_slug = chapters[j];
      const path = "./source/" + book_slug + "/" + chapter_slug;

      if (!fs.existsSync(path + "/pushed.txt")) {
        if (fs.existsSync(path + "/chapter_updated.json")) {
          const chapter = JSON.parse(
            await fs.readFileSync(path + "/chapter_updated.json", {
              encoding: "utf-8",
            })
          );
          console.log(
            "====== " + chapter_slug + " - " + j + "/" + chapters.length
          );
          const saved = await saveChapter(currentBookInfo, {
            ...chapter,
            ready: true,
          });
          if (saved) await fs.writeFileSync(path + "/pushed.txt", "");
        }
      }

      if (j === chapters.length - 1) {
        let msg = book_slug + " [Complete book] ";
        console.log(msg);
        const res = await fetchWithRetry(
          CRAWLER_HOST + "/api/v2/metruyencv/complete",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              rawChapters: rawChapters.map((item) => ({
                ...item,
                ready: true,
              })),
              book: currentBookInfo,
            }),
          },
          3
        );
      }
      j++;
    }
    i++;
  }
})();
