# Journal overflow regression

The existing earned-Journal geometry assertion failed against a fresh runner
server at320px with200% text, seed13/manual3. Document/window overflow was0px,
but the Journal panel overflowed32px. `journal-diagnostic.json` retains the
boundary failure; `journal-elements.json` identifies the glossary articles and
headings exceeding the panel edge.

The articles now permit shrinking (`min-width:0`) and wrapping long headings
(`overflow-wrap:anywhere`). No content is hidden. `journal-fixed.json` records
all326 earned-Journal checks passing, including every original width/stage/text
scale, on real WASM6214dd8a… . Its concurrent glossary group failed an unsettled
height read (253.76px); after awaiting fonts and finite opening animations,
`glossary-settled.json` passes the unchanged300px minimum and all32 checks.
The additional console geometry diagnostics will be covered by the next final
package run. Format and default lint pass. This proves the scoped UI regression
fix, not final Cut235 native progression or whole-client acceptance.
