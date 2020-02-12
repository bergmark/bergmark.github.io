(function () {
  var H = Strict.Translit.Hangeul;
  console.log(H.blockFromTranslit("han"));
  console.log(H.jamoFromChar("h"));
  console.log(H.blocksFromTranslit("han geul"));
  console.log(H.blocksFromTranslit("han  geul"));
  console.log(H.translitFromBlock("한"));
  console.log(H.translitFromBlocks("한글"));
  console.log(H.translitFromBlocks("한 글"));
})();
