"""Apply documented, record-bounded compatibility fixes to the pinned parser."""
def patch(source):
    def replace(old, new):
        nonlocal source
        assert source.count(old) == 1, old[:100]
        source = source.replace(old, new)
    replace('if (version.gte(new HWPVersion(5, 1, 0, 0))) {\n        for (let i = 7;', 'if (reader.remainByte() >= 12) {\n        for (let i = 7;')
    replace('if (properties.kind === 2 /* Storage */) {\n      binData.id = reader.readUInt16();\n    }', 'if (properties.kind === 2 /* Storage */) {\n      binData.id = reader.readUInt16();\n      if (!reader.isEOF()) binData.extension = reader.readString();\n    }')
    replace('mapEffectColorEffectKind(reader.readUInt32()),', 'reader.readUInt32(), // Preserve HWP effect codes (e.g. 0x0204), not ordinal indices.')
    replace('const entry = find3(container, `Root Entry/BodyText/Section${i}`);', 'const entry = find3(container, `Root Entry/${header.flags.distributed ? "ViewText" : "BodyText"}/Section${i}`);')
    replace('sections.push(Section.fromEntry(entry, header));', '''// Distribution documents use encrypted ViewText, never the fallback BodyText.
      const sectionEntry = header.flags.distributed ? { content: globalThis.HwpDistribution.decode(entry.content, header.flags.compressed) } : entry;
      sections.push(Section.fromEntry(sectionEntry, header));''')
    replace('const controls = chars.extendedControls().map(() => Control.fromRecords(iterator, version));', '''const controls = chars.extendedControls().map(() => {
      // Reserved extended chars can have no corresponding record. Stay inside
      // this paragraph instead of consuming the next paragraph's header.
      if (iterator.isDone() || iterator.peek().level <= current.level || iterator.peek().id !== SectionTagID.HWPTAG_CTRL_HEADER) return new Control(0, null);
      return Control.fromRecords(iterator, version);
    });''')
    replace('    if (unknown.length > 0) {\n      throw new Error("BodyText: Paragraph: Unknown records");\n    }\n    return new _Paragraph(', '    // Some writers put caption/list records after the shape component. Keep\n    // nested paragraphs readable and retain a warning for unpainted objects.\n    const extras = [];\n    const tail = new PeekableIterator(unknown.values());\n    while (!tail.isDone()) {\n      if (tail.peek().id === SectionTagID.HWPTAG_PARA_HEADER) extras.push(Paragraph.fromRecord(tail, version));\n      else tail.next();\n    }\n    if (unknown.length) controls.push(new Control(0, { records: unknown, paragraphs: extras }));\n    return new _Paragraph(')
    start=source.index('function mapFill(reader) {')
    end=source.index('var ColorFill =', start)
    source=source[:start]+'''function mapFill(reader) {
  // Fill kind is a bit set. Read the common extension before per-fill alpha.
  // Never consume to EOF here: shape-component records have a shadow after it.
  const kind = reader.readUInt32();
  if (kind & ~7) throw new Error(`Unknown fill kind: ${kind}`);
  const content = {};
  if (kind & 1) {
    content.background_color = ColorRef.fromBits(reader.readUInt32());
    content.backgroundColor = content.background_color;
    content.patternColor = ColorRef.fromBits(reader.readUInt32());
    content.patternKind = mapPatternKind(reader.readInt32() + 1);
  }
  if (kind & 4) {
    content.kind = mapGradationKind(reader.readUInt8());
    content.angle = reader.readUInt32(); content.centerX = reader.readUInt32();
    content.centerY = reader.readUInt32(); content.step = reader.readUInt32();
    const count = reader.readUInt32();
    if (count < 2 || count > 1024) throw new Error("Invalid gradient color count");
    content.changePoints = [];
    if (count > 2) for (let i=0; i<count; i++) content.changePoints.push(reader.readUInt32());
    content.colors = [];
    for (let i=0; i<count; i++) content.colors.push(ColorRef.fromBits(reader.readUInt32()));
  }
  if (kind & 2) {
    content.imageKind = mapImageFillKind(reader.readUInt8());
    content.image = Image.fromReader(reader);
  }
  const extraSize = reader.readUInt32();
  content.extension = reader.read(extraSize);
  if (kind & 1) content.alpha = reader.readUInt8();
  if (kind & 4) content.gradientAlpha = reader.readUInt8();
  if (kind & 2) content.imageAlpha = reader.readUInt8();
  return { kind, content };
}
'''+source[end:]
    return source
