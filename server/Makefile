MAKEFLAGS += --no-print-directory --silent

################################################################################
# Makefile Variables
################################################################################
SHELL := $(or $(shell echo $$SHELL),/bin/sh)
PYTHON = $(shell command -v python3)

POETRY_VERSION = 1.8.3

VENV_PATH ?= .venv

POETRY_HOME ?= .poetry
POETRY = $(POETRY_HOME)/bin/poetry


################################################################################
# Default
################################################################################
.DEFAULT_GOAL := default

.PHONY: default
default:
	@echo "Running default task"
	@$(MAKE) install


################################################################################
# Setup & Install
################################################################################
.PHONY: install
install:
	$(MAKE) install-poetry
	$(MAKE) new-venv
	$(MAKE) install-deps

.PHONY: reinstall
reinstall:
	$(MAKE) clean-all
	$(MAKE) install


.PHONY: install-poetry
install-poetry:
	@if [ -f "$(POETRY)" ]; then \
		echo "Poetry already installed in virtual environment"; \
	else \
		echo "Installing poetry in virtual environment"; \
		$(PYTHON) -m venv "$(POETRY_HOME)"; \
		$(POETRY_HOME)/bin/pip install --upgrade pip; \
		$(POETRY_HOME)/bin/pip install poetry==$(POETRY_VERSION); \
	fi

.PHONY: install-deps
install-deps:
	@echo "Installing dependencies"
	@$(POETRY) install --no-root --no-interaction --no-ansi --all-extras -v

################################################################################
# Development - Virtual Environment
################################################################################
.PHONY: new-venv
new-venv:
	@echo "Creating virtual environment"
	@$(PYTHON) -m venv "$(VENV_PATH)"

.PHONY: delete-venv
delete-venv:
	@echo "Deleting virtual environment"
	@rm -rf "$(VENV_PATH)"

.PHONY: remove-poetry
remove-poetry:
	@echo "Removing poetry from virtual environment"
	@rm -rf "$(POETRY_HOME)"


################################################################################
# Development - Utilities
################################################################################
.PHONY: clean
clean:
	@echo "Cleaning up"
	@rm -rf .pytest_cache .ruff_cache .coverage htmlcov/
	@find . -type d -name '__pycache__' -exec rm -rf {} +
	@find . -type f -name '*.py[co]' -delete
	@find . -type f -name '*~' -delete

.PHONY: clean-all
clean-all: delete-venv remove-poetry clean


################################################################################
# Development - Dependencies
################################################################################
.PHONY: lock
lock:
	@echo "Locking dependencies"
	@$(POETRY) lock --no-update



################################################################################
# Linting & Formatting
################################################################################
.PHONY: lint
lint:
	@echo "Running ruff check and format check"
	@$(POETRY) run ruff check . --exit-non-zero-on-fix
	@$(POETRY) run ruff format . --check

.PHONY: format
format:
	@echo "Running ruff format"
	@$(POETRY) run ruff format .
	@$(POETRY) run ruff check . --fix

.PHONY: autofix-unsafe
autofix-unsafe:
	@echo "Running ruff with autofix-unsafe"
	@$(POETRY) run ruff check . --unsafe-fixes

.PHONY: typecheck
typecheck:
	@echo "Running pyright"
	@$(POETRY) run pyright

################################################################################
# Development - Start Server
################################################################################

.PHONY: run
run:
	@echo "Starting the development server"
	@PYTHONPATH=src $(POETRY) run uvicorn ai_personal_lawyer.main:app --host 0.0.0.0 --port 2999 --reload
