APP_NAME ?= my-gui
ENTRY ?= app.py

.PHONY: run build build-dir clean licenses

run:
	uv run python $(ENTRY)

# One-file binary (recommended)
build:
	uvx pyinstaller --clean --noconfirm \
		--name $(APP_NAME) --windowed --onefile \
		--collect-all PySide6 --collect-all PIL \
		$(ENTRY)

# Directory bundle (faster build, easier debug)
build-dir:
	uvx pyinstaller --clean --noconfirm \
		--name $(APP_NAME) --windowed \
		--collect-all PySide6 --collect-all PIL \
		$(ENTRY)

licenses:
	uv run pip-licenses --from=mixed --with-authors --with-urls \
		--format=json --output-file=licenses.json

clean:
	rm -rf build dist *.spec
