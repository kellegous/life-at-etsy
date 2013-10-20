all: life.js work.js life.css

test:
	./bin/test

pack: life.tar.gz

life.tar.gz: all
	tar -zcvf life.tar.gz \
		bin \
		tests \
		lib \
		*.main.ts \
		*.main.scss \
		*.js \
		*.css \
		img/rand0.svg \
		img/rand1.svg \
		img/cube.png \
		img/cube.psd

run:
	./bin/http

%.js : %.main.ts lib/*.ts
	tsc --out $@ --removeComments $<

%.css : %.main.scss
	sass --no-cache --style=compressed $< $@

clean:
	rm -rf life.js life.css work.js life.tar.gz out