const { Builder, until, By } = require("selenium-webdriver");
const jsdom = require("jsdom");
const fs = require("fs");
const request = require("request");
const { fetchWithRetry } = require("../lib/utils");
const {
  API_CHAPTER,
  API_CHAPTER_SIGN,
  TARGET_HOST,
  CRAWLER_HOST,
  SOURCE_DIR,
  MAX_PAGE,
  ACCOUNT_PW,
  ACCOUNT_USER,
  PAGE_DIR,
} = require("../lib/config");

var urls = [];
var j = 0;
var retry_time = 5;
var retry_count = 0;
var currentBookInfo = null;
var isLogged = false;

const driver = new Builder().forBrowser("chrome").build();

async function driverSleep(driver, second) {
  await driver.sleep(second * 1000);
}
async function toggleMenu(driver) {
  const b = await driver.findElement(
    By.xpath('//*[@id="header"]/div/div/div[3]/button')
  );
  if (!b) await driverSleep(1);
  await b.click();
}
async function clickLogin(driver) {
  await driver
    .findElement(
      By.xpath(
        '//*[@id="app"]/div[2]/div/div[2]/div/div/div/div/div[2]/div[1]/div/div[1]/button'
      )
    )
    .click();

  const input_email = await driver.findElement(
    By.xpath(
      "/html/body/div[1]/div[3]/div[2]/div/div/div[2]/div[1]/div[2]/input"
    )
  );
  const input_password = await driver.findElement(
    By.xpath(
      "/html/body/div[1]/div[3]/div[2]/div/div/div[2]/div[2]/div[2]/input"
    )
  );
  await input_email.sendKeys(ACCOUNT_USER);
  await input_password.sendKeys(ACCOUNT_PW);
  await driver
    .findElement(
      By.xpath(
        '//*[@id="app"]/div[3]/div[2]/div/div/div[2]/div[3]/div[1]/button'
      )
    )
    .click();
  await driverSleep(driver, 1);
  await driver.navigate().refresh();
}

async function chapterSign(driver, bookId) {
  const code = await driver.executeScript("return checksum(16)");
  const options = { json: true };
  return new Promise((resolve) => {
    request(
      API_CHAPTER_SIGN.replace("[BOOK_ID]", bookId).replace("[CODE]", code),
      options,
      async (error, res) => {
        if (error) {
          return console.log(error);
        }
        if (!error && res.statusCode == 200) {
          const { data } = res.body;
          resolve(data);
        } else {
          console.log(error);
        }
      }
    );
  });
}

async function start(itemIndex, book_slug, chapters) {
  if (itemIndex >= urls.length || !!chapters[itemIndex] === false) {
    return;
  }
  // Skip locked chapters
  if (chapters[itemIndex] && chapters[itemIndex].unlock_price > 0) {
    return;
  }
  const url =
    TARGET_HOST + "/truyen/" + book_slug + "/chuong-" + urls[itemIndex].index;
  let require_login = itemIndex >= chapters.length - 10;

  // const connectId = {
  //   ttl: 86400000,
  //   lastUsed: new Date().getMilliseconds() + 86400000,
  //   lastSynced: new Date().getMilliseconds() + 86400000,
  // };

  // await driver.manage().addCookie({
  //   name: "metruyenchucom_session",
  //   value: MTC_SESSION,
  // });
  // await driver.manage().addCookie({
  //   name: "accessToken",
  //   value: MTC_ACCESS_TOKEN,
  // });
  // await driver.manage().addCookie({
  //   name: "connectId",
  //   value: JSON.stringify(connectId),
  // });

  await driver.navigate(url);

  await driver.get(url);
  const elem_chapter_detail = await driver.findElement(
    By.xpath("//div[@id='chapter-detail']")
  );
  await driver.wait(until.elementIsVisible(elem_chapter_detail, 15000));
  if (require_login && !isLogged) {
    await toggleMenu(driver);
    await driverSleep(driver, 1);
    await clickLogin(driver);
    await driverSleep(driver, retry_time);
    isLogged = true;
  }

  await driverSleep(driver, 1);

  const chapter_signed = await chapterSign(driver, chapters[itemIndex].id);

  await driverSleep(driver, 1);

  chapters[itemIndex] = chapter_signed;

  const content = await driver.getPageSource();

  if (!fs.existsSync("./source/" + currentBookInfo.slug)) {
    fs.mkdirSync("./source/" + currentBookInfo.slug);
  }
  if (
    !fs.existsSync(
      "./source/" + currentBookInfo.slug + "/" + chapters[itemIndex].slug
    )
  ) {
    fs.mkdirSync(
      "./source/" + currentBookInfo.slug + "/" + chapters[itemIndex].slug
    );
  }
  // await fs.writeFileSync(
  //   "./source/" +
  //     currentBookInfo.slug +
  //     "/" +
  //     chapters[itemIndex].slug +
  //     "/source.html",
  //   content
  // );

  const dom = new jsdom.JSDOM(content);
  const canvasList = dom.window.document.querySelectorAll("canvas");
  canvasList.forEach((item, index) => {
    item.removeAttribute("width");
    item.removeAttribute("height");
    item.removeAttribute("style");
    item.setAttribute("id", index);
  });
  let chapter_html =
    dom.window.document.querySelector("div#chapter-detail").innerHTML;

  const outputExecute = await driver.executeScript(
    `const bookSlug = arguments[0];
const chapterSlug = arguments[1];
return (async function convertCanvasToBinary() {
  const canvas = document.querySelectorAll("canvas");
  canvas.forEach(async (elem, index) => {
    await uploadImage(await elem.toDataURL(), "canvas-" + index);
  });
  return canvas.length;
})();
async function uploadImage(binary, filename) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 10000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        console.log("File successfully uploaded!");
        resolve({ success: true });
        return;
      }
      reject({ success: false });
    };

    const fileData = new FormData();
    fileData.append("data", binary);
    fileData.append("filename", filename);
    fileData.append("bookSlug", bookSlug);
    fileData.append("chapterSlug", chapterSlug);

    xhr.open("POST", "http://localhost:8081/save-image", true);

    xhr.send(fileData);
  });
}
`,
    currentBookInfo.slug,
    chapters[itemIndex].slug
  );
  console.log("Total canvas " + outputExecute);

  const checkId = "middle-content-one";
  const elem = dom.window.document.querySelector("div#" + checkId);
  if (!!elem || retry_count) {
    // if (!fs.existsSync(SOURCE_DIR + book_slug + "/chapter")) {
    //   fs.mkdirSync(SOURCE_DIR + book_slug + "/chapter");
    // }

    const item = chapters[itemIndex];
    const next =
      itemIndex < chapters.length - 1 ? chapters[itemIndex + 1] : null;
    const prev = itemIndex > 0 ? chapters[itemIndex - 1] : null;

    var _start = chapter_html.indexOf(
      '<div data-x-bind="ChapterContent" class="break-words">'
    );

    if (_start > 0) {
      _start =
        _start +
        '<div data-x-bind="ChapterContent" class="break-words">'.length;
      var _end = chapter_html.indexOf("Vui lòng đăng nhập để đọc tiếp", _start);

      chapter_html = chapter_html.substring(_start, _end);

      chapter_html = chapter_html.replace(/<(\/{0,})div([^>]{0,})>/gi, "");
    }

    console.log("save chapter ", item.slug);

    await saveChapter(chapter_html, item, next, prev);
    const lastIndex = +itemIndex + 1;
    await fs.writeFileSync(
      "./source/" + currentBookInfo.slug + "/last_index.txt",
      lastIndex.toString()
    );
    if (j < urls.length - 1) {
      await start(itemIndex + 1, book_slug, chapters);
    }
    retry_count = 0;
  } else {
    retry_count++;
    await start(itemIndex, book_slug, chapters);
  }
}

async function getChapterList(bookId) {
  let options = { json: true };

  return new Promise((resolve) => {
    request(
      API_CHAPTER.replace("[BOOK_ID]", bookId),
      options,
      async (error, res) => {
        if (error) {
          resolve(error);
          return console.log(error);
        }

        if (!error && res.statusCode == 200) {
          const { data } = res.body;
          resolve(data);
        }
      }
    );
  });
}

async function saveBook(book, html, chapters) {
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
    if (result) {
      currentBookInfo = result.book;
      urls = result.chapters;
      await fs.writeFileSync(
        SOURCE_DIR + book.slug + "/book_saved.json",
        JSON.stringify(result.book)
      );
      await fs.writeFileSync(
        SOURCE_DIR + book.slug + "/chapters.json",
        JSON.stringify(result.chapters)
      );
    }
    return result;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function saveChapter(html, item, next, prev) {
  delete item.content;
  const payload = {
    word_count: item.word_count,
    html,
    chapter: item,
    book: currentBookInfo,
    next: next ? { name: next.name, slug: next.slug } : null,
    prev: prev ? { name: prev.name, slug: prev.slug } : null,
  };

  if (!fs.existsSync("./source/" + currentBookInfo.slug)) {
    fs.mkdirSync("./source/" + currentBookInfo.slug);
  }
  if (!fs.existsSync("./source/" + currentBookInfo.slug + "/" + item.slug)) {
    fs.mkdirSync("./source/" + currentBookInfo.slug + "/" + item.slug);
  }

  await fs.writeFileSync(
    "./source/" + currentBookInfo.slug + "/" + item.slug + "/chapter.json",
    JSON.stringify(payload)
  );
}

async function run() {
  let ready = false;
  const last_index = await fs.readFileSync("./last_index.txt");
  const last_page = await fs.readFileSync("./last_page.txt");
  const last_book = await fs.readFileSync("./last_book.txt").toString();
  let page = last_page && Number(last_page) > 0 ? Number(last_page) : 1;
  j = Number(last_index) ?? 0;
  while (page < MAX_PAGE) {
    let i = 0;
    const data = await fs.readFileSync(PAGE_DIR + page + ".json");
    const books = JSON.parse(data);
    while (i < books.length) {
      const book = books[i];
      const book_slug = books[i].slug;
      if (last_book === "" || book_slug === last_book) {
        ready = true;
      }
      if (ready) {
        console.log(book_slug);
        await fs.writeFileSync("./last_book.txt", book_slug);
        // const book = await JSON.parse(
        //   await fs.readFileSync(SOURCE_DIR + book_slug + "/book.json")
        // );
        if (book?.link?.indexOf("vtruyen.com") >= 0) {
          i++;
          continue;
        }
        const rpHtml = await fetch(TARGET_HOST + "/truyen/" + book_slug, [], 2);
        var html;

        if (rpHtml && rpHtml.status == 200) {
          html = await rpHtml.text();
        }
        const chapters = await getChapterList(book.id);
        await fs.writeFileSync(
          SOURCE_DIR + book_slug + "/chapters.json",
          JSON.stringify(chapters)
        );
        currentBookInfo = book;
        // const chapters = fs.readFileSync(SOURCE_DIR + data[i] + "/chapters.json");
        const book_saved = await saveBook(book, html, chapters);

        // await fs.writeFileSync(
        //   SOURCE_DIR + book_slug + "/book_saved.json",
        //   JSON.stringify(book_saved)
        // );
        console.log("save book ", book_slug);
        urls = chapters;

        if (book_saved?.chapters) {
          let lastIndex = book_saved.chapters.findIndex(
            (elem) => elem.ready === false
          );
          let lastIndexLocal = null;
          if (fs.existsSync(SOURCE_DIR + book_slug + "/last_index.txt")) {
            lastIndexLocal = await fs
              .readFileSync(SOURCE_DIR + book_slug + "/last_index.txt")
              .toString();
          }
          if (!!lastIndex === false) {
            lastIndex = lastIndexLocal;
          } else if (lastIndex < Number(lastIndexLocal)) {
            lastIndex = lastIndexLocal;
          } else {
            lastIndex = lastIndex - 1;
          }
          j = !lastIndex ? 0 : Number(lastIndex) - 1;
          await start(j, book_slug, book_saved.chapters);
        } else {
          console.log("Can not save book");
        }

        j = 0;
      }
      i++;
    }
    await fs.writeFileSync("./last_page.txt", page.toString());
    page++;
  }

  driver.quit();
}

run();
