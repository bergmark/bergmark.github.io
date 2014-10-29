{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RebindableSyntax #-}

module Test where

import Prelude
import Translit.Hangeul
import Fay.Text

main :: Fay ()
main = do
  print $ blocksFromTranslit "an nyeong"
  print $ blockFromTranslit "han"
  print $ jamoFromChar "h"
  print $ blocksFromTranslit "han geul"
  print $ blocksFromTranslit "han  geul"
  print $ translitFromBlock "한"
  print $ translitFromBlocks "한글"
  print $ translitFromBlocks "한 글"
