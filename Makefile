all: life.js work.js life.css

test:
	./bin/test

run:
	./bin/http

%.js : %.main.ts lib/*.ts
	tsc --out $@ --removeComments $<

%.css : %.main.scss
	sass --no-cache --style=compressed $< $@

clean:
	rm -rf life.js work.js life.css out