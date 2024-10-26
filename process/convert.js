var fs = require("fs");
var tesseract = require("node-tesseract-ocr");

const config = {
  lang: "vie",
  oem: 1,
  psm: 3,
};

async function trans(filename) {
  return new Promise((resolve, reject) => {
    tesseract
      .recognize(filename, config)
      .then(async (text) => {
        //await fs.writeFileSync(filename.replace(".png", ".txt"), text);
        resolve(text);
      })
      .catch((error) => {
        console.log(error.message);
        resolve();
        //reject(error.message);
      });
  });
}

(async function readSource() {
  const books = await fs.readdirSync("./source");
  let j = 0;
  while (j < books.length) {
    const book_slug = books[j];
    console.log(book_slug);
    await readChapter(book_slug);
    j++;
  }
})();

async function readChapter(book_slug) {
  const chapters = fs.readdirSync("./source/" + book_slug);
  let j = 0;
  while (j < chapters.length) {
    const chapter_slug = chapters[j];
    console.log("============ ", chapter_slug);
    if (
      chapter_slug != "book.json" &&
      chapter_slug != "book_saved.json" &&
      chapter_slug != "chapters.json" &&
      chapter_slug != "last_index.txt"
    ) {
      await readCanvas(book_slug, chapter_slug);
    }
    j++;
  }
}

async function readCanvas(book_slug, chapter_slug) {
  const data = fs.readdirSync("./source/" + book_slug + "/" + chapter_slug);
  const path = "./source/" + book_slug + "/" + chapter_slug;
  let i = 0;
  if (fs.existsSync(path + "/done.txt")) return;
  if (!fs.existsSync(path + "/chapter.json")) return;
  let chapter = JSON.parse(
    await fs.readFileSync(path + "/chapter.json", { encoding: "utf-8" })
  );
  let chapter_content = chapter.html;
  const canvas = data.filter(
    (filename) => filename.startsWith("canvas-") && filename.endsWith(".png")
  );
  while (i < canvas.length) {
    const filename = canvas[i];
    const position = Number(
      filename.replace("canvas-", "").replace(".png", "")
    );
    const text = await trans(path + "/" + filename);
    console.log("================ ", filename, " === Done");
    chapter_content = chapter_content.replace(
      '<canvas id="' + position + '"></canvas>',
      "<br/>" + text + "<br/>"
    );
    console.log("------------------------------");
    console.log("Replace canvas-" + i + ".png with ", text);
    console.log("------------------------------");
    // remove image
    await fs.unlinkSync(path + "/" + filename);
    i++;
  }
  chapter.html = chapter_content;

  //await fs.writeFileSync(path + "/chapter.html", chapter_content);

  await fs.writeFileSync(
    path + "/chapter_updated.json",
    JSON.stringify(chapter),
    {
      encoding: "utf-8",
    }
  );
  await fs.writeFileSync(path + "/done.txt", "");
}
