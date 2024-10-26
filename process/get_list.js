const fs = require("fs");
const request = require("request");
const { delay } = require("../lib/utils");
const { API_LIST, MAX_PAGE, SOURCE_DIR, PAGE_DIR } = require("../lib/config");

let start_page = 1;

async function getList(page) {
  let options = { json: true };
  let n = 0;

  console.log("Page ", page);

  await fs.writeFileSync("./last_book.txt", "");
  await fs.writeFileSync("./last_page.txt", "");
  request(
    API_LIST.replace("[PAGE]", page),
    options,
    async (error, res, body) => {
      if (error) {
        return console.log(error);
      }

      if (!error && res.statusCode == 200) {
        const { data } = res.body;
        books = data;

        await fs.writeFileSync(PAGE_DIR + page + ".json", JSON.stringify(data));

        while (n < data.length) {
          const book = data[n];

          if (!fs.existsSync(SOURCE_DIR + book.slug)) {
            await fs.mkdirSync(SOURCE_DIR + book.slug);
          }

          await fs.writeFileSync(
            SOURCE_DIR + book.slug + "/book.json",
            JSON.stringify(book)
          );

          await delay(1);
          n++;
        }

        if (start_page < MAX_PAGE) {
          await delay(1);
          start_page++;
          getList(start_page);
        }
      }
      console.log("  Done");
    }
  );
}

if (!fs.existsSync(SOURCE_DIR)) {
  fs.mkdirSync(SOURCE_DIR);
}
if (!fs.existsSync(PAGE_DIR)) {
  fs.mkdirSync(PAGE_DIR);
}

getList(start_page);
