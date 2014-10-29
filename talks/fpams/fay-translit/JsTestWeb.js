








$(document).ready(function () {

  var H = Strict.Translit.Hangeul;

  var inp = jQuery("#inp");
  var out = jQuery("#out");

  inp.keyup(function () {
    out.val(H.blocksFromTranslit(inp.val()));
  });
  out.keyup(function () {
    out.val(H.translitFromBlocks(out.val()));
  });

});
