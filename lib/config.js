const SOURCE_DIR = "./source/";
const PAGE_DIR = "./page/";
const LOCAL_SERVER = "http://localhost:8081";
const CRAWLER_HOST = "https://crawler.truyenchu.com.vn";
const TARGET_HOST = "https://metruyencv.com";
const API_CHAPTER =
  "https://backend.metruyencv.com/api/chapters?filter%5Bbook_id%5D=[BOOK_ID]&filter%5Btype%5D=published";
const API_CHAPTER_SIGN =
  "https://backend.metruyencv.com/api/chapters/[BOOK_ID]?sign=[CODE]";
const MTC_SESSION =
  "eyJpdiI6ImFsUCtVVE81dHFWV0EwZFl4Z2tzdVE9PSIsInZhbHVlIjoiTGNmRXBsaEZsUjN5UFVSYUpjVWlubjV0ZEFaV09PT1lWdXZTSWFFZGFFTGY4akRDeGowVFFnK05paWJqZTVjWiIsIm1hYyI6IjAyMWJhMmIxNGRjYzRlZTQwNGIxOTYwNDMxZGQzZjliNTM5OTAyYzEwMTA5NDBmMjVmMTgyMDJhNTMyMDM0MjYifQ%3D%3D";
const MTC_ACCESS_TOKEN = "799507|8YNDEjxnFiqJKi9sK9Vb1J62SB0fEfik3SjGtXrY";
const API_LIST =
  "https://backend.metruyencv.com/api/books?filter%5Bgender%5D=1&filter%5Bstate%5D=published&include=author%2Cgenres%2Ccreator&limit=20&page=1&sort=-new_chap_at";
const API_IMAGE = "https://static.cdnno.com/poster/[SLUG]/300.jpg?1714358910";
const MAX_PAGE = 100;

const ACCOUNT_USER = "slevan89@gmail.com";
const ACCOUNT_PW = "Sangit@89";

module.exports = {
  LOCAL_SERVER,
  SOURCE_DIR,
  CRAWLER_HOST,
  TARGET_HOST,
  API_CHAPTER,
  API_CHAPTER_SIGN,
  MTC_SESSION,
  MTC_ACCESS_TOKEN,
  API_LIST,
  API_IMAGE,
  MAX_PAGE,
  ACCOUNT_USER,
  ACCOUNT_PW,
  PAGE_DIR,
};
