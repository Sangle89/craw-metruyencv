var fs = require("fs");

(async function run() {
  const books = await fs.readdirSync("./source");
  let i = 0;
  while (i < books.length) {
    const book_slug = books[i];
    console.info(book_slug);
    const chapters = await fs.readdirSync("./source/" + book_slug);
    let t = 0;
    while (t < chapters.length) {
      const chapter_slug = chapters[t];
      if (
        chapter_slug !== "lastIndex.txt" &&
        chapter_slug !== "lastPush.txt" &&
        chapter_slug !== "chapters.json" &&
        chapter_slug !== "book.json" &&
        !chapter_slug.endsWith(".jpg") &&
        (await fs.existsSync(
          "./source/" + book_slug + "/" + chapter_slug + "/done.txt"
        ))
      ) {
        const chapter_data = await fs.readdirSync(
          "./source/" + book_slug + "/" + chapter_slug
        );
        const canvas = chapter_data.filter(
          (filename) =>
            filename.startsWith("canvas-") &&
            (filename.endsWith(".png") || filename.endsWith(".txt"))
        );
        let j = 0;
        while (j < canvas.length) {
          await fs.unlinkSync(
            "./source/" + book_slug + "/" + chapter_slug + "/" + canvas[j]
          );
          j++;
        }
      }
      t++;
    }

    i++;
  }
})();
