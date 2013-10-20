package main

import (
  "fmt"
  "image"
  "image/png"
  "os"
  "strings"
)

func loadPng(filename string) (image.Image, error) {
  r, err := os.Open(filename)
  if err != nil {
    return nil, err
  }
  defer r.Close()

  return png.Decode(r)
}

func main() {
  m, err := loadPng("etsy-logo.png")
  if err != nil {
    panic(err)
  }

  b := m.Bounds()
  w, h := b.Dx(), b.Dy()
  dw, dh := w/150, h/150

  var s []int
  for j := 0; j < 150; j++ {
    for i := 0; i < 150; i++ {
      ix := j*150 + i
      _, _, _, a := m.At(i*dw+dw/2, j*dh+dh/2).RGBA()
      if a > 128 {
        s = append(s, ix)
      }
    }
  }

  ss := make([]string, len(s))
  for i := 0; i < len(s); i++ {
    ss[i] = fmt.Sprintf("%d", s[i])
  }
  fmt.Printf("%s\n", strings.Join(ss, ", "))
}
