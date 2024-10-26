const request = require("request");
const fs = require("fs");
function delay(second) {
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, second);
  });
}

async function fetchWithRetry(url, options, retry) {
  var count = 0;
  if (retry == undefined || retry == null) retry = 1;

  var result = { success: false, data: null };

  while (count < Math.max(1, retry)) {
    try {
      var rp = await fetch(url, options);
      console.log(await rp.status);
      if (rp.status == 400) {
        console.log(await rp.text());
      }
      if (rp.status == 200) {
        if (
          rp.headers.get("content-type") &&
          rp.headers.get("content-type").indexOf("application/json") >= 0
        ) {
          return await rp.json();
          //var data = null;
          //data = await rp.json();

          //result = { success: true, data: data };
        } else {
          return await rp.text();
          //result = { success: true, data: _txt };
        }
      } else {
        result = { success: false, data: null };
      }

      //console.log('fetch result:', { result, count, retry });

      if (result != null && result.success) {
        return result.data;
      }
    } catch (error) {
      console.log("fetch error:", error);
    }

    count++;
  }

  return result.data;
}

const download = function (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
};

module.exports = {
  delay,
  fetchWithRetry,
  download,
};
