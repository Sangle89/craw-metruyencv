const bookSlug = arguments[0];
const chapterSlug = arguments[1];
return (async function convertCanvasToBinary() {
  const canvas = doc.querySelectorAll("canvas");
  canvas.forEach(async (elem, index) => {
    await uploadImage(elem.toDataURL(), "canvas-" + index);
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
