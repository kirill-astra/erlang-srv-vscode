# VSCode Erlang SRV

The VSCode extension for [Erlang SRV](https://github.com/kirill-astra/erlang-srv.git).

## Building

Make sure you have [Node.js](https://nodejs.org/) installed. Then run:
```
npm install -g vsce
```

and
```
vsce package
```


## Color Themes

Erlang SRV extension provides language gramma according to TextMate [rules](https://macromates.com/manual/en/language_grammars)
Provided language gramma uses standart naming conventions, so most of the themes works out of box.

However, it is possible to assign custom token colors by editing `settings.json` file (press *cntr-shift-P* and type *Preferences: Open Settings (JSON)*).
For example, `Default Dark+` theme customization could be:

```json
    "editor.tokenColorCustomizations": {
        "[Default Dark+]": {
            "textMateRules": [
                {
                    "scope": "entity.name.function.definition.erlang",
                    "settings": {
                        "foreground": "#9CDCFE"
                    }
                },
                {
                    "scope": [
                        "entity.name.type.call.erlang",
                        "entity.name.type.spec.erlang",
                        "entity.name.type.qualifier.erlang",
                        "entity.other.attribute-name.record-field.erlang",
                        "entity.other.attribute-name.map-field.erlang"
                    ],
                    "settings": {
                        "foreground": "#DCDCAA"
                    }
                },
                {
                    "scope": [
                        "entity.name.type.basic.erlang",
                        "entity.name.type.buildin.erlang",
                        "keyword.operator.textual.erlang"
                    ],
                    "settings": {
                        "foreground": "#a6dbb8"
                    }
                },
                {
                    "scope": "punctuation.separator.lc.erlang",
                    "settings": {
                        "foreground": "#C586C0"
                    }
                }
            ]
        }
    }
```
The list of scopes that can be customized is located [here](syntaxes/style-names.txt)