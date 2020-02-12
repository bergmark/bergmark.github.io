{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RebindableSyntax #-}

module FayTestWeb where

import Prelude
import Fay.Text
import JQuery
import Translit.Hangeul

main :: Fay ()
main = ready $ do
  inp <- select "#inp"
  out <- select "#out"

  (`keyup` inp) $ \_ -> do
    t <- getVal inp
    setVal (blocksFromTranslit t) out
    return ()
  (`keyup` out) $ \_ -> do
    b <- getVal out
    setVal (translitFromBlocks b) inp
    return ()
