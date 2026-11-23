/* @hwp.js/parser 0.0.4-alpha.0, Apache-2.0. Imports adapted to local browser globals; see third_party. */
// src/utils/byte-reader.ts
var ByteReader = class {
  view;
  offsetByte = 0;
  constructor(buffer) {
    this.view = new DataView(buffer);
  }
  readUInt32() {
    const result = this.view.getUint32(this.offsetByte, true);
    this.#updateOffsetByte(4);
    return result;
  }
  readInt32() {
    const result = this.view.getInt32(this.offsetByte, true);
    this.#updateOffsetByte(4);
    return result;
  }
  readInt16() {
    const result = this.view.getUint16(this.offsetByte, true);
    this.#updateOffsetByte(2);
    return result;
  }
  readUInt16() {
    const result = this.view.getUint16(this.offsetByte, true);
    this.#updateOffsetByte(2);
    return result;
  }
  readInt8() {
    const result = this.view.getInt8(this.offsetByte);
    this.#updateOffsetByte(1);
    return result;
  }
  readUInt8() {
    const result = this.view.getUint8(this.offsetByte);
    this.#updateOffsetByte(1);
    return result;
  }
  readFloat32() {
    const result = this.view.getFloat32(this.offsetByte, true);
    this.#updateOffsetByte(4);
    return result;
  }
  readFloat64() {
    const result = this.view.getFloat64(this.offsetByte, true);
    this.#updateOffsetByte(8);
    return result;
  }
  readRecord() {
    const value = this.readUInt32();
    const id = value & 1023;
    const level = value >> 10 & 1023;
    const size = value >> 20 & 4095;
    if (size === 4095) {
      return {
        id,
        level,
        data: this.read(this.readUInt32())
      };
    }
    return {
      id,
      level,
      data: this.read(size)
    };
  }
  *records() {
    while (!this.isEOF()) {
      yield this.readRecord();
    }
  }
  read(byte) {
    const result = this.view.buffer.slice(
      this.offsetByte,
      this.offsetByte + byte
    );
    this.#updateOffsetByte(byte);
    return result;
  }
  readString() {
    const length = this.readUInt16();
    const result = [];
    for (let i = 0; i < length; i += 1) {
      result.push(String.fromCharCode(this.readUInt16()));
    }
    return result.join("");
  }
  remainByte() {
    return this.view.byteLength - this.offsetByte;
  }
  skipByte(offset) {
    this.#updateOffsetByte(offset);
  }
  isEOF() {
    return this.view.byteLength === this.offsetByte;
  }
  length() {
    return this.view.byteLength;
  }
  #updateOffsetByte(offset) {
    this.offsetByte += offset;
    if (this.offsetByte > this.view.byteLength) {
      throw new Error("Out of range");
    }
  }
};

// src/constants/tag-id.ts
var HWPTAG_BEGIN = 16;
var DocInfoTagID = ((DocInfoTagID2) => {
  DocInfoTagID2[DocInfoTagID2["HWPTAG_DOCUMENT_PROPERTIES"] = HWPTAG_BEGIN] = "HWPTAG_DOCUMENT_PROPERTIES";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_ID_MAPPINGS"] = HWPTAG_BEGIN + 1] = "HWPTAG_ID_MAPPINGS";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_BIN_DATA"] = HWPTAG_BEGIN + 2] = "HWPTAG_BIN_DATA";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_FACE_NAME"] = HWPTAG_BEGIN + 3] = "HWPTAG_FACE_NAME";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_BORDER_FILL"] = HWPTAG_BEGIN + 4] = "HWPTAG_BORDER_FILL";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_CHAR_SHAPE"] = HWPTAG_BEGIN + 5] = "HWPTAG_CHAR_SHAPE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_TAB_DEF"] = HWPTAG_BEGIN + 6] = "HWPTAG_TAB_DEF";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_NUMBERING"] = HWPTAG_BEGIN + 7] = "HWPTAG_NUMBERING";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_BULLET"] = HWPTAG_BEGIN + 8] = "HWPTAG_BULLET";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_PARA_SHAPE"] = HWPTAG_BEGIN + 9] = "HWPTAG_PARA_SHAPE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_STYLE"] = HWPTAG_BEGIN + 10] = "HWPTAG_STYLE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_DOC_DATA"] = HWPTAG_BEGIN + 11] = "HWPTAG_DOC_DATA";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_DISTRIBUTE_DOC_DATA"] = HWPTAG_BEGIN + 12] = "HWPTAG_DISTRIBUTE_DOC_DATA";
  DocInfoTagID2[DocInfoTagID2["RESERVED"] = HWPTAG_BEGIN + 13] = "RESERVED";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_COMPATIBLE_DOCUMENT"] = HWPTAG_BEGIN + 14] = "HWPTAG_COMPATIBLE_DOCUMENT";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_LAYOUT_COMPATIBILITY"] = HWPTAG_BEGIN + 15] = "HWPTAG_LAYOUT_COMPATIBILITY";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_TRACKCHANGE"] = HWPTAG_BEGIN + 16] = "HWPTAG_TRACKCHANGE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_MEMO_SHAPE"] = HWPTAG_BEGIN + 76] = "HWPTAG_MEMO_SHAPE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_FORBIDDEN_CHAR"] = HWPTAG_BEGIN + 78] = "HWPTAG_FORBIDDEN_CHAR";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_TRACK_CHANGE"] = HWPTAG_BEGIN + 80] = "HWPTAG_TRACK_CHANGE";
  DocInfoTagID2[DocInfoTagID2["HWPTAG_TRACK_CHANGE_AUTHOR"] = HWPTAG_BEGIN + 81] = "HWPTAG_TRACK_CHANGE_AUTHOR";
  return DocInfoTagID2;
})(DocInfoTagID || {});
var SectionTagID = ((SectionTagID2) => {
  SectionTagID2[SectionTagID2["HWPTAG_PARA_HEADER"] = HWPTAG_BEGIN + 50] = "HWPTAG_PARA_HEADER";
  SectionTagID2[SectionTagID2["HWPTAG_PARA_TEXT"] = HWPTAG_BEGIN + 51] = "HWPTAG_PARA_TEXT";
  SectionTagID2[SectionTagID2["HWPTAG_PARA_CHAR_SHAPE"] = HWPTAG_BEGIN + 52] = "HWPTAG_PARA_CHAR_SHAPE";
  SectionTagID2[SectionTagID2["HWPTAG_PARA_LINE_SEG"] = HWPTAG_BEGIN + 53] = "HWPTAG_PARA_LINE_SEG";
  SectionTagID2[SectionTagID2["HWPTAG_PARA_RANGE_TAG"] = HWPTAG_BEGIN + 54] = "HWPTAG_PARA_RANGE_TAG";
  SectionTagID2[SectionTagID2["HWPTAG_CTRL_HEADER"] = HWPTAG_BEGIN + 55] = "HWPTAG_CTRL_HEADER";
  SectionTagID2[SectionTagID2["HWPTAG_LIST_HEADER"] = HWPTAG_BEGIN + 56] = "HWPTAG_LIST_HEADER";
  SectionTagID2[SectionTagID2["HWPTAG_PAGE_DEF"] = HWPTAG_BEGIN + 57] = "HWPTAG_PAGE_DEF";
  SectionTagID2[SectionTagID2["HWPTAG_FOOTNOTE_SHAPE"] = HWPTAG_BEGIN + 58] = "HWPTAG_FOOTNOTE_SHAPE";
  SectionTagID2[SectionTagID2["HWPTAG_PAGE_BORDER_FILL"] = HWPTAG_BEGIN + 59] = "HWPTAG_PAGE_BORDER_FILL";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT"] = HWPTAG_BEGIN + 60] = "HWPTAG_SHAPE_COMPONENT";
  SectionTagID2[SectionTagID2["HWPTAG_TABLE"] = HWPTAG_BEGIN + 61] = "HWPTAG_TABLE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_LINE"] = HWPTAG_BEGIN + 62] = "HWPTAG_SHAPE_COMPONENT_LINE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_RECTANGLE"] = HWPTAG_BEGIN + 63] = "HWPTAG_SHAPE_COMPONENT_RECTANGLE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_ELLIPSE"] = HWPTAG_BEGIN + 64] = "HWPTAG_SHAPE_COMPONENT_ELLIPSE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_ARC"] = HWPTAG_BEGIN + 65] = "HWPTAG_SHAPE_COMPONENT_ARC";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_POLYGON"] = HWPTAG_BEGIN + 66] = "HWPTAG_SHAPE_COMPONENT_POLYGON";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_CURVE"] = HWPTAG_BEGIN + 67] = "HWPTAG_SHAPE_COMPONENT_CURVE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_OLE"] = HWPTAG_BEGIN + 68] = "HWPTAG_SHAPE_COMPONENT_OLE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_PICTURE"] = HWPTAG_BEGIN + 69] = "HWPTAG_SHAPE_COMPONENT_PICTURE";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_CONTAINER"] = HWPTAG_BEGIN + 70] = "HWPTAG_SHAPE_COMPONENT_CONTAINER";
  SectionTagID2[SectionTagID2["HWPTAG_CTRL_DATA"] = HWPTAG_BEGIN + 71] = "HWPTAG_CTRL_DATA";
  SectionTagID2[SectionTagID2["HWPTAG_EQEDIT"] = HWPTAG_BEGIN + 72] = "HWPTAG_EQEDIT";
  SectionTagID2[SectionTagID2["RESERVED"] = HWPTAG_BEGIN + 73] = "RESERVED";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_TEXTART"] = HWPTAG_BEGIN + 74] = "HWPTAG_SHAPE_COMPONENT_TEXTART";
  SectionTagID2[SectionTagID2["HWPTAG_FORM_OBJECT"] = HWPTAG_BEGIN + 75] = "HWPTAG_FORM_OBJECT";
  SectionTagID2[SectionTagID2["HWPTAG_MEMO_SHAPE"] = HWPTAG_BEGIN + 76] = "HWPTAG_MEMO_SHAPE";
  SectionTagID2[SectionTagID2["HWPTAG_MEMO_LIST"] = HWPTAG_BEGIN + 77] = "HWPTAG_MEMO_LIST";
  SectionTagID2[SectionTagID2["HWPTAG_CHART_DATA"] = HWPTAG_BEGIN + 79] = "HWPTAG_CHART_DATA";
  SectionTagID2[SectionTagID2["HWPTAG_VIDEO_DATA"] = HWPTAG_BEGIN + 82] = "HWPTAG_VIDEO_DATA";
  SectionTagID2[SectionTagID2["HWPTAG_SHAPE_COMPONENT_UNKNOWN"] = HWPTAG_BEGIN + 99] = "HWPTAG_SHAPE_COMPONENT_UNKNOWN";
  return SectionTagID2;
})(SectionTagID || {});

// src/constants/ctrl-id.ts
function makeCtrlID(first, second, third, fourth) {
  const firstCode = first.charCodeAt(0);
  const secondCode = second.charCodeAt(0);
  const thirdCode = third.charCodeAt(0);
  const fourthCode = fourth.charCodeAt(0);
  return firstCode << 24 | secondCode << 16 | thirdCode << 8 | fourthCode;
}
var CommonCtrlID = ((CommonCtrlID2) => {
  CommonCtrlID2[CommonCtrlID2["Table"] = makeCtrlID("t", "b", "l", " ")] = "Table";
  CommonCtrlID2[CommonCtrlID2["Line"] = makeCtrlID("$", "l", "i", "n")] = "Line";
  CommonCtrlID2[CommonCtrlID2["Rectangle"] = makeCtrlID("$", "r", "e", "c")] = "Rectangle";
  CommonCtrlID2[CommonCtrlID2["Ellipse"] = makeCtrlID("$", "e", "l", "l")] = "Ellipse";
  CommonCtrlID2[CommonCtrlID2["Arc"] = makeCtrlID("$", "a", "r", "c")] = "Arc";
  CommonCtrlID2[CommonCtrlID2["Polygon"] = makeCtrlID("$", "p", "o", "l")] = "Polygon";
  CommonCtrlID2[CommonCtrlID2["Curve"] = makeCtrlID("$", "c", "u", "r")] = "Curve";
  CommonCtrlID2[CommonCtrlID2["Equation"] = makeCtrlID("e", "q", "e", "d")] = "Equation";
  CommonCtrlID2[CommonCtrlID2["Picture"] = makeCtrlID("$", "p", "i", "c")] = "Picture";
  CommonCtrlID2[CommonCtrlID2["Container"] = makeCtrlID("$", "c", "o", "n")] = "Container";
  CommonCtrlID2[CommonCtrlID2["OLE"] = makeCtrlID("$", "o", "l", "e")] = "OLE";
  CommonCtrlID2[CommonCtrlID2["Connected"] = makeCtrlID("$", "c", "o", "n")] = "Connected";
  CommonCtrlID2[CommonCtrlID2["GenShapeObject"] = makeCtrlID("g", "s", "o", " ")] = "GenShapeObject";
  return CommonCtrlID2;
})(CommonCtrlID || {});
var OtherCtrlID = ((OtherCtrlID2) => {
  OtherCtrlID2[OtherCtrlID2["Section"] = makeCtrlID("s", "e", "c", "d")] = "Section";
  OtherCtrlID2[OtherCtrlID2["Column"] = makeCtrlID("c", "o", "l", "d")] = "Column";
  OtherCtrlID2[OtherCtrlID2["Header"] = makeCtrlID("h", "e", "a", "d")] = "Header";
  OtherCtrlID2[OtherCtrlID2["Footer"] = makeCtrlID("f", "o", "o", "t")] = "Footer";
  OtherCtrlID2[OtherCtrlID2["Footnote"] = makeCtrlID("f", "n", " ", " ")] = "Footnote";
  OtherCtrlID2[OtherCtrlID2["Endnote"] = makeCtrlID("e", "n", " ", " ")] = "Endnote";
  OtherCtrlID2[OtherCtrlID2["AutoNumber"] = makeCtrlID("a", "t", "n", "o")] = "AutoNumber";
  OtherCtrlID2[OtherCtrlID2["NewNumber"] = makeCtrlID("n", "w", "n", "o")] = "NewNumber";
  OtherCtrlID2[OtherCtrlID2["PageHide"] = makeCtrlID("p", "g", "h", "d")] = "PageHide";
  OtherCtrlID2[OtherCtrlID2["PageCT"] = makeCtrlID("p", "g", "c", "t")] = "PageCT";
  OtherCtrlID2[OtherCtrlID2["PageNumberPosition"] = makeCtrlID("p", "g", "n", "p")] = "PageNumberPosition";
  OtherCtrlID2[OtherCtrlID2["IndexMark"] = makeCtrlID("i", "d", "x", "m")] = "IndexMark";
  OtherCtrlID2[OtherCtrlID2["BookMark"] = makeCtrlID("b", "o", "k", "m")] = "BookMark";
  OtherCtrlID2[OtherCtrlID2["Overlapping"] = makeCtrlID("t", "c", "p", "s")] = "Overlapping";
  OtherCtrlID2[OtherCtrlID2["Comment"] = makeCtrlID("t", "d", "u", "t")] = "Comment";
  OtherCtrlID2[OtherCtrlID2["HiddenComment"] = makeCtrlID("t", "c", "m", "t")] = "HiddenComment";
  return OtherCtrlID2;
})(OtherCtrlID || {});
var FieldCtrlID = ((FieldCtrlID2) => {
  FieldCtrlID2[FieldCtrlID2["Unknown"] = makeCtrlID("%", "u", "n", "k")] = "Unknown";
  FieldCtrlID2[FieldCtrlID2["Date"] = makeCtrlID("$", "d", "t", "e")] = "Date";
  FieldCtrlID2[FieldCtrlID2["DocDate"] = makeCtrlID("%", "d", "d", "t")] = "DocDate";
  FieldCtrlID2[FieldCtrlID2["Path"] = makeCtrlID("%", "p", "a", "t")] = "Path";
  FieldCtrlID2[FieldCtrlID2["Bookmark"] = makeCtrlID("%", "b", "m", "k")] = "Bookmark";
  FieldCtrlID2[FieldCtrlID2["MailMerge"] = makeCtrlID("%", "m", "m", "g")] = "MailMerge";
  FieldCtrlID2[FieldCtrlID2["CrossRef"] = makeCtrlID("%", "x", "r", "f")] = "CrossRef";
  FieldCtrlID2[FieldCtrlID2["Formula"] = makeCtrlID("%", "f", "m", "u")] = "Formula";
  FieldCtrlID2[FieldCtrlID2["ClickHere"] = makeCtrlID("%", "c", "l", "k")] = "ClickHere";
  FieldCtrlID2[FieldCtrlID2["Summary"] = makeCtrlID("$", "s", "m", "r")] = "Summary";
  FieldCtrlID2[FieldCtrlID2["UserInfo"] = makeCtrlID("%", "u", "s", "r")] = "UserInfo";
  FieldCtrlID2[FieldCtrlID2["HyperLink"] = makeCtrlID("%", "h", "l", "k")] = "HyperLink";
  FieldCtrlID2[FieldCtrlID2["RevisionSign"] = makeCtrlID("%", "s", "i", "g")] = "RevisionSign";
  FieldCtrlID2[FieldCtrlID2["RevisionDelete"] = makeCtrlID("%", "%", "*", "d")] = "RevisionDelete";
  FieldCtrlID2[FieldCtrlID2["RevisionAttach"] = makeCtrlID("%", "%", "*", "a")] = "RevisionAttach";
  FieldCtrlID2[FieldCtrlID2["RevisionClipping"] = makeCtrlID("%", "%", "*", "C")] = "RevisionClipping";
  FieldCtrlID2[FieldCtrlID2["RevisionSawtooth"] = makeCtrlID("%", "%", "*", "S")] = "RevisionSawtooth";
  FieldCtrlID2[FieldCtrlID2["RevisionThinking"] = makeCtrlID("%", "%", "*", "T")] = "RevisionThinking";
  FieldCtrlID2[FieldCtrlID2["RevisionPraise"] = makeCtrlID("%", "%", "*", "P")] = "RevisionPraise";
  FieldCtrlID2[FieldCtrlID2["RevisionLine"] = makeCtrlID("%", "%", "*", "L")] = "RevisionLine";
  FieldCtrlID2[FieldCtrlID2["RevisionSimpleChange"] = makeCtrlID("%", "%", "*", "c")] = "RevisionSimpleChange";
  FieldCtrlID2[FieldCtrlID2["RevisionHyperLink"] = makeCtrlID("%", "%", "*", "h")] = "RevisionHyperLink";
  FieldCtrlID2[FieldCtrlID2["RevisionLineAttach"] = makeCtrlID("%", "%", "*", "A")] = "RevisionLineAttach";
  FieldCtrlID2[FieldCtrlID2["RevisionLineLink"] = makeCtrlID("%", "%", "*", "i")] = "RevisionLineLink";
  FieldCtrlID2[FieldCtrlID2["RevisionLineTransfer"] = makeCtrlID("%", "%", "*", "t")] = "RevisionLineTransfer";
  FieldCtrlID2[FieldCtrlID2["RevisionRightMove"] = makeCtrlID("%", "%", "*", "r")] = "RevisionRightMove";
  FieldCtrlID2[FieldCtrlID2["RevisionLeftMove"] = makeCtrlID("%", "%", "*", "l")] = "RevisionLeftMove";
  FieldCtrlID2[FieldCtrlID2["RevisionTransfer"] = makeCtrlID("%", "%", "*", "n")] = "RevisionTransfer";
  FieldCtrlID2[FieldCtrlID2["RevisionSimpleInsert"] = makeCtrlID("%", "%", "*", "e")] = "RevisionSimpleInsert";
  FieldCtrlID2[FieldCtrlID2["RevisionSplit"] = makeCtrlID("%", "s", "p", "l")] = "RevisionSplit";
  FieldCtrlID2[FieldCtrlID2["RevisionChange"] = makeCtrlID("%", "%", "m", "r")] = "RevisionChange";
  FieldCtrlID2[FieldCtrlID2["Memo"] = makeCtrlID("%", "%", "m", "e")] = "Memo";
  FieldCtrlID2[FieldCtrlID2["PrivateInfoSecurity"] = makeCtrlID("%", "c", "p", "r")] = "PrivateInfoSecurity";
  FieldCtrlID2[FieldCtrlID2["TableOfContents"] = makeCtrlID("%", "t", "o", "c")] = "TableOfContents";
  return FieldCtrlID2;
})(FieldCtrlID || {});

// src/utils/bit-utils.ts
function getBitValue(mask, start, end = start) {
  const target = mask >> start;
  let temp = 0;
  for (let index = 0; index <= end - start; index += 1) {
    temp <<= 1;
    temp += 1;
  }
  return target & temp;
}
function getFlag(bits, position) {
  const mask = 1 << position;
  return (bits & mask) === mask;
}

// src/models/color-ref.ts
var ColorRef = class _ColorRef {
  constructor(red, green, blue) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }
  static fromBits(bits) {
    return new _ColorRef(
      getBitValue(bits, 0, 7),
      getBitValue(bits, 8, 15),
      getBitValue(bits, 16, 23)
    );
  }
  toHex() {
    return `#${this.red.toString(16)}${this.green.toString(
      16
    )}${this.blue.toString(16)}`;
  }
};

// src/models/version.ts
var HWPVersion = class {
  major;
  minor;
  build;
  revision;
  constructor(major, minor, build, revision) {
    this.major = major;
    this.minor = minor;
    this.build = build;
    this.revision = revision;
  }
  isCompatible(target) {
    return this.major === target.major && this.minor <= target.minor;
  }
  gte(target) {
    if (this.major > target.major) {
      return true;
    }
    if (this.major < target.major) {
      return false;
    }
    if (this.minor > target.minor) {
      return true;
    }
    if (this.minor < target.minor) {
      return false;
    }
    if (this.build > target.build) {
      return true;
    }
    if (this.build < target.build) {
      return false;
    }
    if (this.revision >= target.revision) {
      return true;
    }
    return false;
  }
  toString() {
    return `${this.major}.${this.minor}.${this.build}.${this.revision}`;
  }
  toJSON() {
    return this.toString();
  }
};

// src/models/doc-info/numbering.ts
var Numbering = class _Numbering {
  constructor(start, paragraphHeads) {
    this.start = start;
    this.paragraphHeads = paragraphHeads;
  }
  static fromRecord(record, version) {
    if (record.id !== DocInfoTagID.HWPTAG_NUMBERING) {
      throw new Error("DocInfo:Numbering: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const paragraphHeads = [];
    for (let i = 0; i < 7; i++) {
      paragraphHeads.push(ParagraphHead.fromReader(reader, true));
    }
    const start = reader.readUInt16();
    if (version.gte(new HWPVersion(5, 0, 2, 5))) {
      for (let i = 0; i < 7; i++) {
        paragraphHeads[i].startNumber = reader.readUInt32();
      }
    }
    if (!reader.isEOF()) {
      for (let i = 7; i < 10; i++) {
        paragraphHeads.push(ParagraphHead.fromReader(reader, true));
      }
      if (reader.remainByte() >= 12) {
        for (let i = 7; i < 10; i++) {
          paragraphHeads[i].startNumber = reader.readUInt32();
        }
      }
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Numbering: Reader is not EOF");
    }
    return new _Numbering(start, paragraphHeads);
  }
};
var ParagraphHead = class _ParagraphHead {
  constructor(align, useInstanceWidth, autoIndent, textOffsetKind, widthAdjust, textOffset, charShapeId, numberFormat) {
    this.align = align;
    this.useInstanceWidth = useInstanceWidth;
    this.autoIndent = autoIndent;
    this.textOffsetKind = textOffsetKind;
    this.widthAdjust = widthAdjust;
    this.textOffset = textOffset;
    this.charShapeId = charShapeId;
    this.numberFormat = numberFormat;
  }
  /**
   * 수준별 시작번호
   * - level 1~7: 5.0.2.5 이상
   * - level 8~10: 5.1.0.0 이상
   */
  startNumber;
  static fromReader(reader, numbering) {
    const attribute = reader.readUInt32();
    const align = mapParagraphHeadAlign(getBitValue(attribute, 0, 1));
    const useInstanceWidth = getFlag(attribute, 2);
    const autoIndent = getFlag(attribute, 3);
    const textOffsetKind = mapTextOffsetKind(getBitValue(attribute, 4));
    const widthAdjust = reader.readInt16();
    const textOffset = reader.readInt16();
    const charShapeId = reader.readUInt32();
    const numberFormat = numbering ? reader.readString() : "";
    const head = new _ParagraphHead(
      align,
      useInstanceWidth,
      autoIndent,
      textOffsetKind,
      widthAdjust,
      textOffset,
      charShapeId,
      numberFormat
    );
    return head;
  }
};
function mapParagraphHeadAlign(value) {
  if (value >= 0 /* Left */ && value <= 2 /* Right */) {
    return value;
  }
  throw new Error(`Unknown ParagraphHeadAlign: ${value}`);
}
function mapTextOffsetKind(value) {
  if (value >= 0 /* Percent */ && value <= 1 /* HWPUnit */) {
    return value;
  }
  throw new Error(`Unknown TextOffsetKind: ${value}`);
}

// src/models/doc-info/bullet.ts
var Bullet = class _Bullet {
  constructor(paragraphHead, bulletChar, useImage, image, checkedChar) {
    this.paragraphHead = paragraphHead;
    this.bulletChar = bulletChar;
    this.useImage = useImage;
    this.image = image;
    this.checkedChar = checkedChar;
  }
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_BULLET) {
      throw new Error("DocInfo: Bullet: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const paragraphHead = ParagraphHead.fromReader(reader, false);
    const bulletChar = String.fromCharCode(reader.readUInt16());
    const useImage = reader.readUInt32() > 0;
    const image = Image.fromReader(reader);
    const checkedChar = reader.isEOF() ? "" : String.fromCharCode(reader.readUInt16());
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Bullet: Reader is not EOF");
    }
    return new _Bullet(paragraphHead, bulletChar, useImage, image, checkedChar);
  }
};
var Image = class _Image {
  constructor(bright, contrast, effect, binItemId) {
    this.bright = bright;
    this.contrast = contrast;
    this.effect = effect;
    this.binItemId = binItemId;
  }
  static fromReader(reader) {
    const bright = reader.readUInt8();
    const contrast = reader.readUInt8();
    const effect = reader.readUInt8();
    const binItemId = reader.readUInt16();
    return new _Image(bright, contrast, effect, binItemId);
  }
};

// src/models/doc-info/border-fill.ts
var BorderFill = class _BorderFill {
  constructor(effect3d, effectShadow, slashDiagonalShape, backSlashDiagonalShape, brokenSlashDiagonalLine, brokenBackSlashDiagonalLine, slackDiagonalLineRotated, backSlackDiagonalLineRotated, centerLine, borders, diagonalBorder, fill) {
    this.effect3d = effect3d;
    this.effectShadow = effectShadow;
    this.slashDiagonalShape = slashDiagonalShape;
    this.backSlashDiagonalShape = backSlashDiagonalShape;
    this.brokenSlashDiagonalLine = brokenSlashDiagonalLine;
    this.brokenBackSlashDiagonalLine = brokenBackSlashDiagonalLine;
    this.slackDiagonalLineRotated = slackDiagonalLineRotated;
    this.backSlackDiagonalLineRotated = backSlackDiagonalLineRotated;
    this.centerLine = centerLine;
    this.borders = borders;
    this.diagonalBorder = diagonalBorder;
    this.fill = fill;
  }
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_BORDER_FILL) {
      throw new Error("DocInfo: Border: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const attributes = reader.readUInt16();
    const effect3d = getFlag(attributes, 0);
    const effectShadow = getFlag(attributes, 1);
    const slashDiagonalShape = mapSlashDiagonalShape(
      getBitValue(attributes, 2, 4)
    );
    const backSlashDiagonalShape = mapBackSlashDiagonalShape(
      getBitValue(attributes, 5, 7)
    );
    const brokenSlashDiagonalLine = getBitValue(attributes, 8, 9) > 0;
    const brokenBackSlashDiagonalLine = getFlag(attributes, 10);
    const slackDiagonalLineRotated = getFlag(attributes, 11);
    const backSlackDiagonalLineRotated = getFlag(attributes, 12);
    const centerLine = getFlag(attributes, 13);
    const borders = [
      Border.fromReader(reader),
      Border.fromReader(reader),
      Border.fromReader(reader),
      Border.fromReader(reader)
    ];
    const diagonalBorder = Border.fromReader(reader);
    const fill = mapFill(reader);
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Border: Reader is not EOF");
    }
    return new _BorderFill(
      effect3d,
      effectShadow,
      slashDiagonalShape,
      backSlashDiagonalShape,
      brokenSlashDiagonalLine,
      brokenBackSlashDiagonalLine,
      slackDiagonalLineRotated,
      backSlackDiagonalLineRotated,
      centerLine,
      borders,
      diagonalBorder,
      fill
    );
  }
};
function mapSlashDiagonalShape(value) {
  switch (value) {
    case 0 /* None */:
      return 0 /* None */;
    case 2 /* Slash */:
      return 2 /* Slash */;
    case 3 /* LeftTopToBottomEdge */:
      return 3 /* LeftTopToBottomEdge */;
    case 6 /* LeftTopToRightEdge */:
      return 6 /* LeftTopToRightEdge */;
    case 7 /* LeftTopToBottomRightEdge */:
      return 7 /* LeftTopToBottomRightEdge */;
    default:
      throw new Error(`Unknown slash diagonal shape: ${value}`);
  }
}
function mapBackSlashDiagonalShape(value) {
  switch (value) {
    case 0 /* None */:
      return 0 /* None */;
    case 2 /* BackSlash */:
      return 2 /* BackSlash */;
    case 3 /* RightTopToBottomEdge */:
      return 3 /* RightTopToBottomEdge */;
    case 6 /* RightTopToLeftEdge */:
      return 6 /* RightTopToLeftEdge */;
    case 7 /* RightTopToBottomLeftEdge */:
      return 7 /* RightTopToBottomLeftEdge */;
  }
  throw new Error(`Unknown back slash diagonal shape: ${value}`);
}
var Border = class _Border {
  constructor(width, kind, color) {
    this.width = width;
    this.kind = kind;
    this.color = color;
  }
  static fromReader(reader) {
    const width = reader.readUInt8();
    const kind = mapBorderKind(reader.readUInt8());
    const color = ColorRef.fromBits(reader.readUInt32());
    return new _Border(width, kind, color);
  }
};
function mapBorderKind(value) {
  if (value >= 0 /* Solid */ && value <= 16 /* Slim3DInset */) {
    return value;
  }
  throw new Error(`Unknown border kind: ${value}`);
}
function mapFill(reader) {
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
var ColorFill = class _ColorFill {
  constructor(background_color, patternColor, patternKind, alpha) {
    this.background_color = background_color;
    this.patternColor = patternColor;
    this.patternKind = patternKind;
    this.alpha = alpha;
  }
  static fromReader(reader) {
    const backgroundColor = ColorRef.fromBits(reader.readUInt32());
    const patternColor = ColorRef.fromBits(reader.readUInt32());
    const patternKind = mapPatternKind(reader.readInt32() + 1);
    const alpha = reader.readUInt8();
    if (reader.readUInt32() !== 0) {
      throw new Error("DocInfo: ColorFill: Additional info is not zero");
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: ColorFill: Reader is not EOF");
    }
    return new _ColorFill(backgroundColor, patternColor, patternKind, alpha);
  }
};
function mapPatternKind(value) {
  if (value >= 0 /* None */ && value <= 6 /* CrossDiagonal */) {
    return value;
  }
  throw new Error(`Unknown pattern kind: ${value}`);
}
var GradationFill = class _GradationFill {
  constructor(kind, angle, centerX, centerY, step, changePoints, colors, stepCenter, alpha) {
    this.kind = kind;
    this.angle = angle;
    this.centerX = centerX;
    this.centerY = centerY;
    this.step = step;
    this.changePoints = changePoints;
    this.colors = colors;
    this.stepCenter = stepCenter;
    this.alpha = alpha;
  }
  static fromReader(reader) {
    const kind = mapGradationKind(reader.readUInt8());
    const angle = reader.readUInt32();
    const centerX = reader.readUInt32();
    const centerY = reader.readUInt32();
    const step = reader.readUInt32();
    const count = reader.readUInt32();
    const changePoints = [];
    if (count > 2) {
      changePoints.push(reader.readUInt32());
    }
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(ColorRef.fromBits(reader.readUInt32()));
    }
    if (reader.readUInt32() !== 1) {
      throw new Error("DocInfo: GradationFill: Additional info is not one");
    }
    const stepCenter = reader.readUInt8();
    const alpha = reader.readUInt8();
    if (!reader.isEOF()) {
      throw new Error("DocInfo: GradationFill: Reader is not EOF");
    }
    return new _GradationFill(
      kind,
      angle,
      centerX,
      centerY,
      step,
      changePoints,
      colors,
      stepCenter,
      alpha
    );
  }
};
function mapGradationKind(value) {
  if (value >= 1 /* Linear */ && value <= 4 /* Square */) {
    return value;
  }
  throw new Error(`Unknown gradation kind: ${value}`);
}
var ImageFill = class _ImageFill {
  constructor(kind, image, unknown) {
    this.kind = kind;
    this.image = image;
    this.unknown = unknown;
  }
  static fromReader(reader) {
    const kind = mapImageFillKind(reader.readUInt8());
    const image = Image.fromReader(reader);
    if (reader.readUInt32() !== 0) {
      throw new Error("DocInfo: ImageFill: Additional info is not zero");
    }
    const unknown = reader.read(reader.remainByte());
    return new _ImageFill(kind, image, unknown);
  }
};
function mapImageFillKind(value) {
  if (value >= 0 /* Tile */ && value <= 15 /* None */) {
    return value;
  }
  throw new Error(`Unknown image fill kind: ${value}`);
}

// src/models/controls/page-definition.ts
var PageDefinition = class _PageDefinition {
  constructor(width, height, padding, landscape, gutterKind) {
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.landscape = landscape;
    this.gutterKind = gutterKind;
  }
  static fromRecord(record) {
    if (record.id !== SectionTagID.HWPTAG_PAGE_DEF) {
      throw new Error("PageDefinition: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const width = reader.readUInt32();
    const height = reader.readUInt32();
    const padding = new Padding(
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32()
    );
    const properties = reader.readUInt32();
    const landscape = mapLandscape(getBitValue(properties, 0, 1));
    const gutterKind = mapGutterKind(getBitValue(properties, 1, 2));
    if (!reader.isEOF()) {
      throw new Error("PageDefinition: Reader is not EOF");
    }
    return new _PageDefinition(width, height, padding, landscape, gutterKind);
  }
};
var Padding = class {
  constructor(left, right, top, bottom, header, footer, binding) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.header = header;
    this.footer = footer;
    this.binding = binding;
  }
};
var Landscape = /* @__PURE__ */ ((Landscape2) => {
  Landscape2[Landscape2["Narrowly"] = 0] = "Narrowly";
  Landscape2[Landscape2["Widely"] = 1] = "Widely";
  return Landscape2;
})(Landscape || {});
function mapLandscape(value) {
  switch (value) {
    case 0:
      return 0 /* Narrowly */;
    case 1:
      return 1 /* Widely */;
    default:
      throw new Error(`PageDefinition: Landscape: Invalid landscape: ${value}`);
  }
}
var GutterKind = /* @__PURE__ */ ((GutterKind2) => {
  GutterKind2[GutterKind2["LeftOnly"] = 0] = "LeftOnly";
  GutterKind2[GutterKind2["LeftRight"] = 1] = "LeftRight";
  GutterKind2[GutterKind2["TopBottom"] = 2] = "TopBottom";
  return GutterKind2;
})(GutterKind || {});
function mapGutterKind(value) {
  switch (value) {
    case 0:
      return 0 /* LeftOnly */;
    case 1:
      return 1 /* LeftRight */;
    case 2:
      return 2 /* TopBottom */;
    default:
      throw new Error(
        `PageDefinition: GutterKind: Invalid gutter kind: ${value}`
      );
  }
}

// src/models/controls/section.ts
var SectionControl = class _SectionControl {
  constructor(ctrlId, hideHeader, hideFooter, hideMasterPage, hideBorder, hideFill, hidePageNumber, borderOnFirstPage, fillOnFirstPage, textDirection, hideEmptyLine, newPageNumber, manuscriptPaperOrthography, columnSpace, verticalAlignment, horizontalAlignment, tabSpace, numberingId, pageNumber, pictureNumber, tableNumber, equationNumber, langId, pageDefinition, footnoteShape, endnoteShape, unknown) {
    this.ctrlId = ctrlId;
    this.hideHeader = hideHeader;
    this.hideFooter = hideFooter;
    this.hideMasterPage = hideMasterPage;
    this.hideBorder = hideBorder;
    this.hideFill = hideFill;
    this.hidePageNumber = hidePageNumber;
    this.borderOnFirstPage = borderOnFirstPage;
    this.fillOnFirstPage = fillOnFirstPage;
    this.textDirection = textDirection;
    this.hideEmptyLine = hideEmptyLine;
    this.newPageNumber = newPageNumber;
    this.manuscriptPaperOrthography = manuscriptPaperOrthography;
    this.columnSpace = columnSpace;
    this.verticalAlignment = verticalAlignment;
    this.horizontalAlignment = horizontalAlignment;
    this.tabSpace = tabSpace;
    this.numberingId = numberingId;
    this.pageNumber = pageNumber;
    this.pictureNumber = pictureNumber;
    this.tableNumber = tableNumber;
    this.equationNumber = equationNumber;
    this.langId = langId;
    this.pageDefinition = pageDefinition;
    this.footnoteShape = footnoteShape;
    this.endnoteShape = endnoteShape;
    this.unknown = unknown;
  }
  static fromRecord(record, iterator, version) {
    const reader = new ByteReader(record.data);
    const ctrlId = reader.readUInt32();
    const attribute = reader.readUInt32();
    const hideHeader = getFlag(attribute, 0);
    const hideFooter = getFlag(attribute, 1);
    const hideMasterPage = getFlag(attribute, 2);
    const hideBorder = getFlag(attribute, 3);
    const hideFill = getFlag(attribute, 4);
    const hidePageNumber = getFlag(attribute, 5);
    const borderOnFirstPage = getFlag(attribute, 8);
    const fillOnFirstPage = getFlag(attribute, 9);
    const textDirection = mapTextDirection(getBitValue(attribute, 16, 18));
    const hideEmptyLine = getFlag(attribute, 19);
    const newPageNumber = getBitValue(attribute, 20, 21) === 0 ? false : true;
    const manuscriptPaperOrthography = getFlag(attribute, 22);
    const columnSpace = reader.readInt16();
    const verticalAlignment = reader.readInt16();
    const horizontalAlignment = reader.readInt16();
    const tabSpace = reader.readUInt32();
    const numberingId = reader.readUInt16();
    const pageNumber = reader.readUInt16();
    const pictureNumber = reader.readUInt16();
    const tableNumber = reader.readUInt16();
    const equationNumber = reader.readUInt16();
    const langId = version.gte(new HWPVersion(5, 0, 1, 5)) ? reader.readUInt16() : void 0;
    const unknown = reader.read(reader.remainByte());
    const pageDefinition = PageDefinition.fromRecord(iterator.next());
    const footnoteShape = FootnoteEndnoteShape.fromRecord(iterator.next());
    const endnoteShape = FootnoteEndnoteShape.fromRecord(iterator.next());
    if (iterator.next().id !== SectionTagID.HWPTAG_PAGE_BORDER_FILL) {
      throw new Error("BodyText: SectionControl: Record has wrong ID");
    }
    if (iterator.next().id !== SectionTagID.HWPTAG_PAGE_BORDER_FILL) {
      throw new Error("BodyText: SectionControl: Record has wrong ID");
    }
    if (iterator.next().id !== SectionTagID.HWPTAG_PAGE_BORDER_FILL) {
      throw new Error("BodyText: SectionControl: Record has wrong ID");
    }
    return new _SectionControl(
      ctrlId,
      hideHeader,
      hideFooter,
      hideMasterPage,
      hideBorder,
      hideFill,
      hidePageNumber,
      borderOnFirstPage,
      fillOnFirstPage,
      textDirection,
      hideEmptyLine,
      newPageNumber,
      manuscriptPaperOrthography,
      columnSpace,
      verticalAlignment,
      horizontalAlignment,
      tabSpace,
      numberingId,
      pageNumber,
      pictureNumber,
      tableNumber,
      equationNumber,
      langId,
      pageDefinition,
      footnoteShape,
      endnoteShape,
      unknown
    );
  }
};
function mapTextDirection(value) {
  if (value === 0 /* Horizontal */ || value === 1 /* Vertical */) {
    return value;
  }
  throw new Error(`Unknown TextDirection: ${value}`);
}
var FootnoteEndnoteShape = class _FootnoteEndnoteShape {
  constructor(numberShape, userChar, prefixChar, suffixChar, startNumber, marginTop, marginBottom, commentMargin, divideLineLength, border) {
    this.numberShape = numberShape;
    this.userChar = userChar;
    this.prefixChar = prefixChar;
    this.suffixChar = suffixChar;
    this.startNumber = startNumber;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.commentMargin = commentMargin;
    this.divideLineLength = divideLineLength;
    this.border = border;
  }
  static fromRecord(record) {
    if (record.id !== SectionTagID.HWPTAG_FOOTNOTE_SHAPE) {
      throw new Error("BodyText: FootnoteEndnoteShape: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const attribute = reader.readUInt32();
    const numberShape = mapNumberShape(getBitValue(attribute, 0, 7));
    const userChar = String.fromCharCode(reader.readUInt16());
    const prefixChar = String.fromCharCode(reader.readUInt16());
    const suffixChar = String.fromCharCode(reader.readUInt16());
    const startNumber = reader.readUInt16();
    const divideLineLength = reader.readUInt32();
    const marginTop = reader.readInt16();
    const marginBottom = reader.readInt16();
    const commentMargin = reader.readInt16();
    const border = Border.fromReader(reader);
    if (!reader.isEOF()) {
      throw new Error("BodyText: FootnoteEndnoteShape: Reader is not EOF");
    }
    return new _FootnoteEndnoteShape(
      numberShape,
      userChar,
      prefixChar,
      suffixChar,
      startNumber,
      marginTop,
      marginBottom,
      commentMargin,
      divideLineLength,
      border
    );
  }
};
function mapNumberShape(value) {
  if (value >= 0 /* Digit */ && value <= 16 /* DecagonCircleHanja */) {
    return value;
  }
  if (value === 128 /* Symbol */ || value === 129 /* UserChar */) {
    return value;
  }
  throw new Error(`Unknown NumberShape: ${value}`);
}

// src/models/line-segment.ts
var LineSegment = class _LineSegment {
  constructor(startPosition, verticalPosition, lineHeight, textHeight, baseLineGap, lineSpacing, startPositionInColumn, width, firstLineInPage, firstLineInColumn, empty, first, last, autoHyphenated, indented, heading) {
    this.startPosition = startPosition;
    this.verticalPosition = verticalPosition;
    this.lineHeight = lineHeight;
    this.textHeight = textHeight;
    this.baseLineGap = baseLineGap;
    this.lineSpacing = lineSpacing;
    this.startPositionInColumn = startPositionInColumn;
    this.width = width;
    this.firstLineInPage = firstLineInPage;
    this.firstLineInColumn = firstLineInColumn;
    this.empty = empty;
    this.first = first;
    this.last = last;
    this.autoHyphenated = autoHyphenated;
    this.indented = indented;
    this.heading = heading;
  }
  static fromReader(reader) {
    const startPosition = reader.readUInt32();
    const verticalPosition = reader.readInt32();
    const lineHeight = reader.readInt32();
    const textHeight = reader.readInt32();
    const baseLineGap = reader.readInt32();
    const lineSpacing = reader.readInt32();
    const startPositionInColumn = reader.readInt32();
    const width = reader.readInt32();
    const tag = reader.readUInt32();
    const firstLineInPage = getFlag(tag, 0);
    const firstLineInColumn = getFlag(tag, 1);
    const empty = getFlag(tag, 16);
    const first = getFlag(tag, 17);
    const last = getFlag(tag, 18);
    const autoHyphenated = getFlag(tag, 19);
    const indented = getFlag(tag, 20);
    const heading = getFlag(tag, 21);
    return new _LineSegment(
      startPosition,
      verticalPosition,
      lineHeight,
      textHeight,
      baseLineGap,
      lineSpacing,
      startPositionInColumn,
      width,
      firstLineInPage,
      firstLineInColumn,
      empty,
      first,
      last,
      autoHyphenated,
      indented,
      heading
    );
  }
};

// src/models/paragraph-header.ts
var ParagraphHeader = class _ParagraphHeader {
  constructor(ctrlMask, paragraphShapeId, styleId, sectionBreak, columnsBreak, pageBreak, columnBreak, chars, charShapes, ranges, aligns, instanceId) {
    this.ctrlMask = ctrlMask;
    this.paragraphShapeId = paragraphShapeId;
    this.styleId = styleId;
    this.sectionBreak = sectionBreak;
    this.columnsBreak = columnsBreak;
    this.pageBreak = pageBreak;
    this.columnBreak = columnBreak;
    this.chars = chars;
    this.charShapes = charShapes;
    this.ranges = ranges;
    this.aligns = aligns;
    this.instanceId = instanceId;
  }
  /** 변경추적 병합 문단여부. (5.0.3.2 버전 이상) */
  trackingChangeMerged;
  static fromRecord(record, version) {
    if (record.id !== SectionTagID.HWPTAG_PARA_HEADER) {
      throw new Error("BodyText: Paragraph: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    let chars = reader.readUInt32();
    if (Math.abs(chars & 2147483648) === 2147483648) {
      chars &= 2147483647;
    }
    const ctrlMask = CtrlMask.fromBits(reader.readUInt32());
    const paragraphShapeId = reader.readUInt16();
    const styleId = reader.readUInt8();
    const breakOptions = reader.readUInt8();
    const sectionBreak = getFlag(breakOptions, 0);
    const columnsBreak = getFlag(breakOptions, 1);
    const pageBreak = getFlag(breakOptions, 2);
    const columnBreak = getFlag(breakOptions, 3);
    const charShapes = reader.readUInt16();
    const ranges = reader.readUInt16();
    const aligns = reader.readUInt16();
    const instanceId = reader.readUInt32();
    const header = new _ParagraphHeader(
      ctrlMask,
      paragraphShapeId,
      styleId,
      sectionBreak,
      columnsBreak,
      pageBreak,
      columnBreak,
      chars,
      charShapes,
      ranges,
      aligns,
      instanceId
    );
    if (version.gte(new HWPVersion(5, 0, 3, 2))) {
      header.trackingChangeMerged = reader.readUInt16();
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: ParagraphHeader: Reader is not EOF");
    }
    return header;
  }
};
var CtrlMask = class _CtrlMask {
  constructor(sectionColumnDefinition, fieldStart, fieldEnd, tab, lineBreak, shapeObjectTable, paragraphBreak, hiddenComment, headerFooter, headnoteFootnote, autoNumber, pageBreak, bookMarkIndexMark, subText, hyphen, keepWordSpace, fixedWidthSpace) {
    this.sectionColumnDefinition = sectionColumnDefinition;
    this.fieldStart = fieldStart;
    this.fieldEnd = fieldEnd;
    this.tab = tab;
    this.lineBreak = lineBreak;
    this.shapeObjectTable = shapeObjectTable;
    this.paragraphBreak = paragraphBreak;
    this.hiddenComment = hiddenComment;
    this.headerFooter = headerFooter;
    this.headnoteFootnote = headnoteFootnote;
    this.autoNumber = autoNumber;
    this.pageBreak = pageBreak;
    this.bookMarkIndexMark = bookMarkIndexMark;
    this.subText = subText;
    this.hyphen = hyphen;
    this.keepWordSpace = keepWordSpace;
    this.fixedWidthSpace = fixedWidthSpace;
  }
  static fromBits(bits) {
    return new _CtrlMask(
      getFlag(bits, 2),
      getFlag(bits, 3),
      getFlag(bits, 4),
      getFlag(bits, 9),
      getFlag(bits, 10),
      getFlag(bits, 11),
      getFlag(bits, 13),
      getFlag(bits, 15),
      getFlag(bits, 16),
      getFlag(bits, 17),
      getFlag(bits, 18),
      getFlag(bits, 21),
      getFlag(bits, 22),
      getFlag(bits, 23),
      getFlag(bits, 24),
      getFlag(bits, 30),
      getFlag(bits, 31)
    );
  }
};

// src/models/char.ts
var CharControls = /* @__PURE__ */ ((CharControls2) => {
  CharControls2[CharControls2["Unusable"] = 0] = "Unusable";
  CharControls2[CharControls2["LineBreak"] = 10] = "LineBreak";
  CharControls2[CharControls2["ParaBreak"] = 13] = "ParaBreak";
  CharControls2[CharControls2["Hyphen"] = 24] = "Hyphen";
  CharControls2[CharControls2["Reserved1"] = 25] = "Reserved1";
  CharControls2[CharControls2["Reserved2"] = 26] = "Reserved2";
  CharControls2[CharControls2["Reserved3"] = 27] = "Reserved3";
  CharControls2[CharControls2["Reserved4"] = 28] = "Reserved4";
  CharControls2[CharControls2["Reserved5"] = 29] = "Reserved5";
  CharControls2[CharControls2["KeepWordSpace"] = 30] = "KeepWordSpace";
  CharControls2[CharControls2["FixedWidthSpace"] = 31] = "FixedWidthSpace";
  return CharControls2;
})(CharControls || {});
var CharCode = class {
  constructor(code) {
    this.code = code;
  }
  bytes = 1;
  toString() {
    return String.fromCharCode(this.code);
  }
};
var CharControl = class {
  constructor(control) {
    this.control = control;
  }
  bytes = 1;
  toString() {
    return "";
  }
};
var InlineControl = class {
  constructor(code, buffer) {
    this.code = code;
    this.buffer = buffer;
  }
  bytes = 8;
  toString() {
    return "";
  }
};
var ExtendedControl = class {
  constructor(code, buffer) {
    this.code = code;
    this.buffer = buffer;
  }
  bytes = 8;
  toString() {
    return "";
  }
};
function matchCharControl(input) {
  switch (input) {
    case 0:
      return 0 /* Unusable */;
    case 10:
      return 10 /* LineBreak */;
    case 13:
      return 13 /* ParaBreak */;
    case 24:
      return 24 /* Hyphen */;
    case 25:
      return 25 /* Reserved1 */;
    case 26:
      return 26 /* Reserved2 */;
    case 27:
      return 27 /* Reserved3 */;
    case 28:
      return 28 /* Reserved4 */;
    case 29:
      return 29 /* Reserved5 */;
    case 30:
      return 30 /* KeepWordSpace */;
    case 31:
      return 31 /* FixedWidthSpace */;
    default:
      return null;
  }
}
function readChar(reader) {
  const code = reader.readUInt16();
  if (code > 31) {
    return new CharCode(code);
  }
  const charControl = matchCharControl(code);
  if (charControl) {
    return new CharControl(charControl);
  }
  const buf = reader.read(12);
  const other = reader.readUInt16();
  if (code !== other) {
    throw new Error("invalid char");
  }
  switch (code) {
    case 1:
    case 2:
    case 3:
    case 11:
    case 12:
    case 14:
    case 15:
    case 16:
    case 17:
    case 18:
    case 21:
    case 22:
    case 23:
      return new ExtendedControl(code, buf);
    default:
      return new InlineControl(code, buf);
  }
}

// src/models/char-list.ts
var CharList = class _CharList {
  constructor(chars) {
    this.chars = chars;
  }
  static empty() {
    return new _CharList([new CharControl(13 /* ParaBreak */)]);
  }
  static fromRecord(record, count) {
    if (record.id !== SectionTagID.HWPTAG_PARA_TEXT) {
      throw new Error("BodyText: CharList: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const chars = [];
    let i = 0;
    while (i < count) {
      const char = readChar(reader);
      i += char.bytes;
      chars.push(char);
    }
    if (!reader.isEOF()) {
      throw new Error("BodyText: CharList: Reader is not EOF");
    }
    return new _CharList(chars);
  }
  *[Symbol.iterator]() {
    for (const char of this.chars) {
      yield char;
    }
  }
  get length() {
    return this.chars.length;
  }
  extendedControls() {
    return this.chars.filter((char) => char instanceof ExtendedControl);
  }
};

// src/utils/record.ts
function readItems(records, count, version, fromRecord) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const record = records.next();
    if (record.done) {
      throw new Error("Unexpected EOF");
    }
    items.push(fromRecord(record.value, version));
  }
  return items;
}
function collectChildren(iterator, level) {
  const children = [];
  while (!iterator.isDone() && iterator.peek().level > level) {
    children.push(iterator.next());
  }
  return children;
}

// src/models/range-tag.ts
var RangeTag = class _RangeTag {
  constructor(startPosition, endPosition, tag) {
    this.startPosition = startPosition;
    this.endPosition = endPosition;
    this.tag = tag;
  }
  static fromReader(reader) {
    const startPosition = reader.readUInt32();
    const endPosition = reader.readUInt32();
    const tag = reader.readUInt32();
    return new _RangeTag(startPosition, endPosition, tag);
  }
};

// src/models/char-shape.ts
var CharShape = class _CharShape {
  constructor(startPosition, shapeId) {
    this.startPosition = startPosition;
    this.shapeId = shapeId;
  }
  static fromReader(reader) {
    const startPosition = reader.readUInt32();
    const shapeId = reader.readUInt32();
    return new _CharShape(startPosition, shapeId);
  }
};

// src/models/paragraph.ts
var Paragraph = class _Paragraph {
  constructor(header, chars, charShapes, lineSegments, rangeTags, controls) {
    this.header = header;
    this.chars = chars;
    this.charShapes = charShapes;
    this.lineSegments = lineSegments;
    this.rangeTags = rangeTags;
    this.controls = controls;
  }
  static fromRecord(iterator, version) {
    const current = iterator.next();
    const header = ParagraphHeader.fromRecord(current, version);
    const chars = iterator.peek().id === SectionTagID.HWPTAG_PARA_TEXT ? CharList.fromRecord(iterator.next(), header.chars) : CharList.empty();
    const charShapes = [];
    if (header.charShapes > 0) {
      const record = iterator.next();
      if (record.id !== SectionTagID.HWPTAG_PARA_CHAR_SHAPE) {
        throw new Error("BodyText: CharShape: Record has wrong ID");
      }
      const reader = new ByteReader(record.data);
      for (let i = 0; i < header.charShapes; i++) {
        charShapes.push(CharShape.fromReader(reader));
      }
      if (!reader.isEOF()) {
        throw new Error("BodyText: CharShape: Reader is not EOF");
      }
    }
    const lineSegments = [];
    if (header.aligns > 0) {
      const record = iterator.next();
      if (record.id !== SectionTagID.HWPTAG_PARA_LINE_SEG) {
        throw new Error("BodyText: LineSegment: Record has wrong ID");
      }
      const reader = new ByteReader(record.data);
      for (let i = 0; i < header.aligns; i++) {
        lineSegments.push(LineSegment.fromReader(reader));
      }
      if (!reader.isEOF()) {
        throw new Error("BodyText: LineSegment: Reader is not EOF");
      }
    }
    const rangeTags = [];
    if (header.ranges > 0) {
      const record = iterator.next();
      if (record.id !== SectionTagID.HWPTAG_PARA_RANGE_TAG) {
        throw new Error("BodyText: RangeTag: Record has wrong ID");
      }
      const reader = new ByteReader(record.data);
      for (let i = 0; i < header.ranges; i++) {
        rangeTags.push(RangeTag.fromReader(reader));
      }
      if (!reader.isEOF()) {
        throw new Error("BodyText: RangeTag: Reader is not EOF");
      }
    }
    const controls = chars.extendedControls().map(() => {
      // Reserved extended chars can have no corresponding record. Stay inside
      // this paragraph instead of consuming the next paragraph's header.
      if (iterator.isDone() || iterator.peek().level <= current.level || iterator.peek().id !== SectionTagID.HWPTAG_CTRL_HEADER) return new Control(0, null);
      return Control.fromRecords(iterator, version);
    });
    const unknown = collectChildren(iterator, current.level);
    // Some writers put caption/list records after the shape component. Keep
    // nested paragraphs readable and retain a warning for unpainted objects.
    const extras = [];
    const tail = new PeekableIterator(unknown.values());
    while (!tail.isDone()) {
      if (tail.peek().id === SectionTagID.HWPTAG_PARA_HEADER) extras.push(Paragraph.fromRecord(tail, version));
      else tail.next();
    }
    if (unknown.length) controls.push(new Control(0, { records: unknown, paragraphs: extras }));
    return new _Paragraph(
      header,
      chars,
      charShapes,
      lineSegments,
      rangeTags,
      controls
    );
  }
};

// src/models/controls/paragraph-list.ts
var ParagraphList = class _ParagraphList {
  constructor(header, paragraphs) {
    this.header = header;
    this.paragraphs = paragraphs;
  }
  static fromReader(reader, iterator, version) {
    const header = ParagraphListHeader.fromReader(reader);
    const paragraphs = [];
    for (let i = 0; i < header.count; i++) {
      paragraphs.push(Paragraph.fromRecord(iterator, version));
    }
    return new _ParagraphList(header, paragraphs);
  }
  *[Symbol.iterator]() {
    for (const paragraph of this.paragraphs) {
      yield paragraph;
    }
  }
  get(index) {
    return this.paragraphs[index];
  }
  set(index, paragraph) {
    this.paragraphs[index] = paragraph;
  }
  get length() {
    return this.paragraphs.length;
  }
};
var ParagraphListHeader = class _ParagraphListHeader {
  constructor(count, direction, lineBreak, verticalAlign) {
    this.count = count;
    this.direction = direction;
    this.lineBreak = lineBreak;
    this.verticalAlign = verticalAlign;
  }
  static fromReader(reader) {
    const count = reader.readUInt32();
    const attribute = reader.readUInt32();
    const direction = mapDirection(attribute >> 0 & 3);
    const lineBreak = mapLineBreak(attribute >> 3 & 3);
    const verticalAlign = mapVerticalAlign(attribute >> 5 & 3);
    return new _ParagraphListHeader(count, direction, lineBreak, verticalAlign);
  }
};
function mapDirection(value) {
  if (value >= 0 /* Horizontal */ && value <= 1 /* Vertical */) {
    return value;
  }
  throw new Error(`Unknown Direction: ${value}`);
}
function mapLineBreak(value) {
  if (value >= 0 /* Normal */ && value <= 2 /* Dynamic */) {
    return value;
  }
  throw new Error(`Unknown LineBreak: ${value}`);
}
function mapVerticalAlign(value) {
  if (value >= 0 /* Top */ && value <= 2 /* Bottom */) {
    return value;
  }
  throw new Error(`Unknown VerticalAlign: ${value}`);
}

// src/models/controls/common-properties.ts
var CommonProperties = class _CommonProperties {
  constructor(ctrlId, treatAsChar, affectLetterSpacing, verticalRelativeTo, verticalAlign, horizontalRelativeTo, horizontalAlign, flowWithText, allowOverlap, widthRelativeTo, heightRelativeTo, protect, textWrap, textFlow, numberingKind, offset, width, height, zOrder, margin, instanceId, preventPageBreak, description, caption) {
    this.ctrlId = ctrlId;
    this.treatAsChar = treatAsChar;
    this.affectLetterSpacing = affectLetterSpacing;
    this.verticalRelativeTo = verticalRelativeTo;
    this.verticalAlign = verticalAlign;
    this.horizontalRelativeTo = horizontalRelativeTo;
    this.horizontalAlign = horizontalAlign;
    this.flowWithText = flowWithText;
    this.allowOverlap = allowOverlap;
    this.widthRelativeTo = widthRelativeTo;
    this.heightRelativeTo = heightRelativeTo;
    this.protect = protect;
    this.textWrap = textWrap;
    this.textFlow = textFlow;
    this.numberingKind = numberingKind;
    this.offset = offset;
    this.width = width;
    this.height = height;
    this.zOrder = zOrder;
    this.margin = margin;
    this.instanceId = instanceId;
    this.preventPageBreak = preventPageBreak;
    this.description = description;
    this.caption = caption;
  }
  static fromRecord(record, iterator, version) {
    const reader = new ByteReader(record.data);
    const ctrlId = reader.readUInt32();
    const attribute = reader.readUInt32();
    const treatAsChar = getFlag(attribute, 0);
    const affectLetterSpacing = getFlag(attribute, 2);
    const verticalRelativeTo = mapVerticalRelativeTo(
      getBitValue(attribute, 3, 4)
    );
    const verticalAlign = treatAsChar ? mapAlign(getBitValue(attribute, 5, 7), verticalRelativeTo) : void 0;
    const horizontalRelativeTo = mapHorizontalRelativeTo(
      getBitValue(attribute, 8, 9)
    );
    const horizontalAlign = treatAsChar ? mapAlign(getBitValue(attribute, 10, 12), horizontalRelativeTo) : void 0;
    const flowWithText = verticalRelativeTo === 2 /* Paragraph */ ? getFlag(attribute, 13) : void 0;
    const allowOverlap = treatAsChar ? void 0 : flowWithText === true ? false : getFlag(attribute, 14);
    const widthRelativeTo = mapWidthRelativeTo(getBitValue(attribute, 15, 17));
    const heightRelativeTo = mapHeightRelativeTo(getBitValue(attribute, 18, 19));
    const protect = verticalRelativeTo === 2 /* Paragraph */ ? getFlag(attribute, 20) : void 0;
    const textWrap = treatAsChar ? void 0 : mapTextWrap(getBitValue(attribute, 21, 23));
    const textFlow = textWrap === 0 /* Square */ || textWrap === 1 /* Tight */ || textWrap === 2 /* Through */ ? mapTextFlow(getBitValue(attribute, 24, 25)) : void 0;
    const numberingKind = mapNumberingKind(getBitValue(attribute, 26, 28) % 4);
    const offset = new Offset(reader.readInt32(), reader.readInt32());
    const width = reader.readUInt32();
    const height = reader.readUInt32();
    const zOrder = reader.readInt32();
    const margin = [
      reader.readInt16(),
      reader.readInt16(),
      reader.readInt16(),
      reader.readInt16()
    ];
    const instanceId = reader.readUInt32();
    const preventPageBreak = reader.readInt32() === 0;
    const description = reader.remainByte() > 0 ? reader.readString() : "";
    if (!reader.isEOF()) {
      throw new Error("Control: Reader is not EOF");
    }
    const caption = iterator.peek().id === SectionTagID.HWPTAG_LIST_HEADER ? Caption.fromRecords(iterator, version) : void 0;
    return new _CommonProperties(
      ctrlId,
      treatAsChar,
      affectLetterSpacing,
      verticalRelativeTo,
      verticalAlign,
      horizontalRelativeTo,
      horizontalAlign,
      flowWithText,
      allowOverlap,
      widthRelativeTo,
      heightRelativeTo,
      protect,
      textWrap,
      textFlow,
      numberingKind,
      offset,
      width,
      height,
      zOrder,
      margin,
      instanceId,
      preventPageBreak,
      description,
      caption
    );
  }
};
function mapVerticalRelativeTo(value) {
  if (value >= 0 /* Paper */ && value <= 2 /* Paragraph */) {
    return value;
  }
  throw new Error(`Unknown VerticalRelativeTo: ${value}`);
}
function mapAlign(value, relTo) {
  if (relTo === 0 || relTo === 1) {
    switch (value) {
      case 0:
        return 0 /* Top */;
      case 1:
        return 1 /* Center */;
      case 2:
        return 2 /* Bottom */;
      case 3:
        return 5 /* Inside */;
      case 4:
        return 6 /* Outside */;
      default:
        throw new Error("\uC798\uBABB\uB41C \uAC12\uC785\uB2C8\uB2E4.");
    }
  } else {
    switch (value) {
      case 0:
        return 3 /* Left */;
      case 2:
        return 4 /* Right */;
      default:
        throw new Error("\uC798\uBABB\uB41C \uAC12\uC785\uB2C8\uB2E4.");
    }
  }
}
function mapHorizontalRelativeTo(value) {
  if (value >= 0 /* Paper */ && value <= 3 /* Paragraph */) {
    return value;
  }
  throw new Error(`Unknown HorizontalRelativeTo: ${value}`);
}
function mapWidthRelativeTo(value) {
  if (value >= 0 /* Paper */ && value <= 4 /* Absolute */) {
    return value;
  }
  throw new Error(`Unknown WidthRelativeTo: ${value}`);
}
function mapHeightRelativeTo(value) {
  if (value >= 0 /* Paper */ && value <= 2 /* Absolute */) {
    return value;
  }
  throw new Error(`Unknown HeightRelativeTo: ${value}`);
}
function mapTextWrap(value) {
  if (value >= 0 /* Square */ && value <= 5 /* InFrontOfText */) {
    return value;
  }
  throw new Error(`Unknown TextWrap: ${value}`);
}
function mapTextFlow(value) {
  if (value >= 0 /* BothSides */ && value <= 3 /* LargestOnly */) {
    return value;
  }
  throw new Error(`Unknown TextFlow: ${value}`);
}
function mapNumberingKind(value) {
  if (value >= 0 /* None */ && value <= 3 /* Equation */) {
    return value;
  }
  throw new Error(`Unknown NumberingKind: ${value}`);
}
var Offset = class {
  constructor(vertical, horizontal) {
    this.vertical = vertical;
    this.horizontal = horizontal;
  }
};
var Caption = class _Caption {
  constructor(paragraphs, align, fullSize, width, gap, lastWidth, unknown) {
    this.paragraphs = paragraphs;
    this.align = align;
    this.fullSize = fullSize;
    this.width = width;
    this.gap = gap;
    this.lastWidth = lastWidth;
    this.unknown = unknown;
  }
  static fromRecords(iterator, version) {
    const record = iterator.next();
    if (record.id !== SectionTagID.HWPTAG_LIST_HEADER) {
      throw new Error("Caption: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const paragraphs = ParagraphList.fromReader(reader, iterator, version);
    const attribute = reader.readUInt32();
    const align = mapCaptionAlign(getBitValue(attribute, 0, 1));
    const fullSize = getFlag(attribute, 2);
    const width = reader.readUInt32();
    const gap = reader.readInt16();
    const lastWidth = reader.readUInt32();
    const unknown = reader.isEOF() ? void 0 : reader.read(8);
    if (!reader.isEOF()) {
      throw new Error("Caption: Reader is not EOF");
    }
    return new _Caption(
      paragraphs,
      align,
      fullSize,
      width,
      gap,
      lastWidth,
      unknown
    );
  }
};
function mapCaptionAlign(value) {
  if (value >= 0 /* Left */ && value <= 3 /* Bottom */) {
    return value;
  }
  throw new Error(`Unknown CaptionAlign: ${value}`);
}

// src/models/controls/draw-text.ts
var DrawText = class _DrawText {
  constructor(paragraphs, marginLeft, marginRight, marginTop, marginBottom, lastWidth, unknown) {
    this.paragraphs = paragraphs;
    this.marginLeft = marginLeft;
    this.marginRight = marginRight;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.lastWidth = lastWidth;
    this.unknown = unknown;
  }
  static fromRecords(records, version) {
    const record = records.next();
    if (record.id !== SectionTagID.HWPTAG_LIST_HEADER) {
      throw new Error("BodyText: DrawText: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const paragraphs = ParagraphList.fromReader(reader, records, version);
    const marginLeft = reader.readUInt16();
    const marginRight = reader.readUInt16();
    const marginTop = reader.readUInt16();
    const marginBottom = reader.readUInt16();
    const lastWidth = reader.readUInt32();
    const unknown = reader.read(reader.remainByte());
    return new _DrawText(
      paragraphs,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      lastWidth,
      unknown
    );
  }
};

// src/models/controls/element-properties.ts
var ElementProperties = class _ElementProperties {
  constructor(ctrlId, offsetX, offsetY, groupLevel, localFileVersion, originalWidth, originalHeight, currentWidth, currentHeight, horizontalFlip, verticalFlip, angle, centerX, centerY, translationMatrix, scaleMatrices, rotationMatrices, childrenIds, instanceId, outline, fill, shadow) {
    this.ctrlId = ctrlId;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.groupLevel = groupLevel;
    this.localFileVersion = localFileVersion;
    this.originalWidth = originalWidth;
    this.originalHeight = originalHeight;
    this.currentWidth = currentWidth;
    this.currentHeight = currentHeight;
    this.horizontalFlip = horizontalFlip;
    this.verticalFlip = verticalFlip;
    this.angle = angle;
    this.centerX = centerX;
    this.centerY = centerY;
    this.translationMatrix = translationMatrix;
    this.scaleMatrices = scaleMatrices;
    this.rotationMatrices = rotationMatrices;
    this.childrenIds = childrenIds;
    this.instanceId = instanceId;
    this.outline = outline;
    this.fill = fill;
    this.shadow = shadow;
  }
  static fromRecords(records, fromGso) {
    const record = records.next();
    if (record.id !== SectionTagID.HWPTAG_SHAPE_COMPONENT) {
      throw new Error("BodyText: ElementProperties: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const ctrlId = reader.readUInt32();
    if (fromGso) {
      if (ctrlId !== reader.readUInt32()) {
        throw new Error("BodyText: ElementProperties: Control ID mismatch");
      }
    }
    const offsetX = reader.readInt32();
    const offsetY = reader.readInt32();
    const groupLevel = reader.readUInt16();
    const localFileVersion = reader.readUInt16();
    const originalWidth = reader.readUInt32();
    const originalHeight = reader.readUInt32();
    const currentWidth = reader.readUInt32();
    const currentHeight = reader.readUInt32();
    const attribute = reader.readUInt32();
    const horizontalFlip = getFlag(attribute, 0);
    const verticalFlip = getFlag(attribute, 1);
    const angle = reader.readInt16();
    const centerX = reader.readInt32();
    const centerY = reader.readInt32();
    const count = reader.readUInt16();
    const translationMatrix = readTransformationMatrix(reader);
    const scaleMatrices = [];
    const rotationMatrices = [];
    for (let i = 0; i < count; i++) {
      scaleMatrices.push(readTransformationMatrix(reader));
      rotationMatrices.push(readTransformationMatrix(reader));
    }
    let childrenIds = null;
    let instanceId = null;
    if (ctrlId === CommonCtrlID.Container && !reader.isEOF()) {
      const count2 = reader.readUInt16();
      const ids = [];
      for (let i = 0; i < count2; i++) {
        ids.push(reader.readUInt32());
      }
      childrenIds = ids;
      instanceId = reader.readUInt32();
    }
    const outline = !reader.isEOF() ? Outline.fromReader(reader, ctrlId) : null;
    const fill = !reader.isEOF() ? mapFill(reader) : null;
    const shadow = !reader.isEOF() ? Shadow.fromReader(reader) : null;
    if (!reader.isEOF()) {
      throw new Error("BodyText: ElementProperties: Reader is not EOF");
    }
    return new _ElementProperties(
      ctrlId,
      offsetX,
      offsetY,
      groupLevel,
      localFileVersion,
      originalWidth,
      originalHeight,
      currentWidth,
      currentHeight,
      horizontalFlip,
      verticalFlip,
      angle,
      centerX,
      centerY,
      translationMatrix,
      scaleMatrices,
      rotationMatrices,
      childrenIds,
      instanceId,
      outline,
      fill,
      shadow
    );
  }
};
var Outline = class _Outline {
  constructor(color, width, kind, endCap, headStyle, tailStyle, headSize, tailSize, headFill, tailFill, style) {
    this.color = color;
    this.width = width;
    this.kind = kind;
    this.endCap = endCap;
    this.headStyle = headStyle;
    this.tailStyle = tailStyle;
    this.headSize = headSize;
    this.tailSize = tailSize;
    this.headFill = headFill;
    this.tailFill = tailFill;
    this.style = style;
  }
  static fromReader(reader, ctrlId) {
    const color = ColorRef.fromBits(reader.readUInt32());
    const width = reader.readUInt32();
    const attribute = reader.readUInt32();
    const kind = mapBorderKind(getBitValue(attribute, 0, 5));
    const defaultCap = ctrlId === CommonCtrlID.Picture ? 0 /* Round */ : 1 /* Flat */;
    const endCap = mapEndCap(getBitValue(attribute, 6, 9)) || defaultCap;
    const headStyle = mapArrowStyle(getBitValue(attribute, 10, 15));
    const tailStyle = mapArrowStyle(getBitValue(attribute, 16, 21));
    const headSize = mapArrowSize(getBitValue(attribute, 22, 25));
    const tailSize = mapArrowSize(getBitValue(attribute, 26, 29));
    const headFill = getFlag(attribute, 30);
    const tailFill = getFlag(attribute, 31);
    const style = mapOutlineStyle(reader.readUInt8());
    return new _Outline(
      color,
      width,
      kind,
      endCap,
      headStyle,
      tailStyle,
      headSize,
      tailSize,
      headFill,
      tailFill,
      style
    );
  }
};
function mapEndCap(value) {
  if (value >= 0 /* Round */ && value <= 1 /* Flat */) {
    return value;
  }
  throw new Error(`Unknown EndCap: ${value}`);
}
function mapOutlineStyle(value) {
  if (value >= 0 /* Normal */ && value <= 2 /* Inner */) {
    return value;
  }
  throw new Error(`Unknown OutlineStyle: ${value}`);
}
function mapArrowStyle(value) {
  if (value >= 0 /* None */ && value <= 9 /* FieldBox */) {
    return value;
  }
  throw new Error(`Unknown ArrowStyle: ${value}`);
}
function mapArrowSize(value) {
  if (value >= 0 /* SmallSmall */ && value <= 8 /* LargeLarge */) {
    return value;
  }
  throw new Error(`Unknown ArrowSize: ${value}`);
}
var Shadow = class _Shadow {
  constructor(kind, color, offsetX, offsetY, alpha, unknown) {
    this.kind = kind;
    this.color = color;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.alpha = alpha;
    this.unknown = unknown;
  }
  static fromReader(reader) {
    const kind = mapShadowKind(reader.readUInt32());
    const color = ColorRef.fromBits(reader.readUInt32());
    const offsetX = reader.readInt32();
    const offsetY = reader.readInt32();
    const unknown = reader.read(5);
    const alpha = reader.readUInt8();
    return new _Shadow(kind, color, offsetX, offsetY, alpha, unknown);
  }
};
function mapShadowKind(value) {
  if (value >= 0 /* None */ && value <= 10 /* Large */) {
    return value;
  }
  throw new Error(`Unknown ShadowKind: ${value}`);
}
function readTransformationMatrix(reader) {
  return [
    [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()],
    [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()],
    [0, 0, 1]
  ];
}

// src/models/controls/unknown.ts
var UnknownControl = class _UnknownControl {
  constructor(records) {
    this.records = records;
  }
  static fromRecord(current, iterator) {
    return new _UnknownControl(collectChildren(iterator, current.level));
  }
};

// src/models/controls/shapes/picture.ts
var PictureControl = class _PictureControl {
  constructor(commonProperties, elementProperties, content) {
    this.commonProperties = commonProperties;
    this.elementProperties = elementProperties;
    this.content = content;
  }
  static fromRecord(record, iterator, version) {
    const commonProperties = CommonProperties.fromRecord(
      record,
      iterator,
      version
    );
    const elementProperties = ElementProperties.fromRecords(iterator, false);
    const content = PictureRecord.fromRecords(iterator);
    return new _PictureControl(commonProperties, elementProperties, content);
  }
};
var PictureRecord = class _PictureRecord {
  constructor(outline, rect, left, top, right, bottom, marginLeft, marginRight, marginTop, marginBottom, image, instanceId, effect, additionalProperties) {
    this.outline = outline;
    this.rect = rect;
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.marginLeft = marginLeft;
    this.marginRight = marginRight;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.image = image;
    this.instanceId = instanceId;
    this.effect = effect;
    this.additionalProperties = additionalProperties;
  }
  static fromRecords(records) {
    const record = records.next();
    if (record.id !== SectionTagID.HWPTAG_SHAPE_COMPONENT_PICTURE) {
      throw new Error("BodyText: PictureRecord: Record has wrong tag ID");
    }
    const reader = new ByteReader(record.data);
    const outline = PictureOutline.fromReader(reader);
    const rect = Rect.fromReader(reader);
    const left = reader.readInt32();
    const top = reader.readInt32();
    const right = reader.readInt32();
    const bottom = reader.readInt32();
    const marginLeft = reader.readInt16();
    const marginRight = reader.readInt16();
    const marginTop = reader.readInt16();
    const marginBottom = reader.readInt16();
    const image = Image.fromReader(reader);
    outline.alpha = reader.readUInt8();
    const instanceId = reader.isEOF() ? null : reader.readUInt32();
    const effect = reader.isEOF() ? null : PictureEffect.fromReader(reader);
    const additionalProperties = reader.isEOF() ? null : PictureAdditionalProperties.fromReader(reader);
    if (!reader.isEOF()) {
      throw new Error("BodyText: PictureRecord: There are remaining bytes");
    }
    return new _PictureRecord(
      outline,
      rect,
      left,
      top,
      right,
      bottom,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      image,
      instanceId,
      effect,
      additionalProperties
    );
  }
};
var PictureOutline = class _PictureOutline {
  constructor(color, width, kind, endCap, headStyle, tailStyle, headSize, tailSize, headFill, tailFill, alpha) {
    this.color = color;
    this.width = width;
    this.kind = kind;
    this.endCap = endCap;
    this.headStyle = headStyle;
    this.tailStyle = tailStyle;
    this.headSize = headSize;
    this.tailSize = tailSize;
    this.headFill = headFill;
    this.tailFill = tailFill;
    this.alpha = alpha;
  }
  static fromReader(reader) {
    const color = ColorRef.fromBits(reader.readUInt32());
    const width = reader.readUInt32();
    const attribute = reader.readUInt32();
    const kind = mapBorderKind(getBitValue(attribute, 0, 5));
    const endCap = mapEndCap(getBitValue(attribute, 6, 9));
    const headStyle = mapArrowStyle(getBitValue(attribute, 10, 15));
    const tailStyle = mapArrowStyle(getBitValue(attribute, 16, 21));
    const headSize = mapArrowSize(getBitValue(attribute, 22, 25));
    const tailSize = mapArrowSize(getBitValue(attribute, 26, 29));
    const headFill = getFlag(attribute, 30);
    const tailFill = getFlag(attribute, 31);
    return new _PictureOutline(
      color,
      width,
      kind,
      endCap,
      headStyle,
      tailStyle,
      headSize,
      tailSize,
      headFill,
      tailFill,
      0
    );
  }
};
var Rect = class _Rect {
  constructor(leftTop, rightTop, rightBottom, leftBottom) {
    this.leftTop = leftTop;
    this.rightTop = rightTop;
    this.rightBottom = rightBottom;
    this.leftBottom = leftBottom;
  }
  static fromReader(reader) {
    return new _Rect(
      Point.fromReader(reader),
      Point.fromReader(reader),
      Point.fromReader(reader),
      Point.fromReader(reader)
    );
  }
};
var Point = class _Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static fromReader(reader) {
    return new _Point(reader.readInt32(), reader.readInt32());
  }
};
var PictureEffect = class _PictureEffect {
  constructor(shadow, glow, softEdge, reflection) {
    this.shadow = shadow;
    this.glow = glow;
    this.softEdge = softEdge;
    this.reflection = reflection;
  }
  static fromReader(reader) {
    const attribute = reader.readUInt32();
    const shadow = getFlag(attribute, 0) ? PictureShadow.fromReader(reader) : null;
    const glow = getFlag(attribute, 1) ? Glow.fromReader(reader) : null;
    const softEdge = getFlag(attribute, 2) ? SoftEdge.fromReader(reader) : null;
    const reflection = getFlag(attribute, 3) ? Reflection.fromReader(reader) : null;
    return new _PictureEffect(shadow, glow, softEdge, reflection);
  }
};
var PictureShadow = class _PictureShadow {
  constructor(style, alpha, radius, direction, distance, align, skewX, skewY, scaleX, scaleY, rotation, color) {
    this.style = style;
    this.alpha = alpha;
    this.radius = radius;
    this.direction = direction;
    this.distance = distance;
    this.align = align;
    this.skewX = skewX;
    this.skewY = skewY;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.rotation = rotation;
    this.color = color;
  }
  static fromReader(reader) {
    return new _PictureShadow(
      mapShadowStyle(reader.readInt32()),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      mapAlignStyle(reader.readInt32()),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readInt32() > 0,
      EffectColor.fromReader(reader)
    );
  }
};
var ShadowStyle = /* @__PURE__ */ ((ShadowStyle2) => {
  ShadowStyle2[ShadowStyle2["Outside"] = 0] = "Outside";
  ShadowStyle2[ShadowStyle2["Inside"] = 1] = "Inside";
  return ShadowStyle2;
})(ShadowStyle || {});
function mapShadowStyle(value) {
  if (value >= 0 /* Outside */ && value <= 1 /* Inside */) {
    return value;
  }
  throw new Error(`Invalid ShadowStyle value: ${value}`);
}
var AlignStyle = /* @__PURE__ */ ((AlignStyle2) => {
  AlignStyle2[AlignStyle2["TopLeft"] = 0] = "TopLeft";
  AlignStyle2[AlignStyle2["Top"] = 1] = "Top";
  AlignStyle2[AlignStyle2["TopRight"] = 2] = "TopRight";
  AlignStyle2[AlignStyle2["Left"] = 3] = "Left";
  AlignStyle2[AlignStyle2["Center"] = 4] = "Center";
  AlignStyle2[AlignStyle2["Right"] = 5] = "Right";
  AlignStyle2[AlignStyle2["BottomLeft"] = 6] = "BottomLeft";
  AlignStyle2[AlignStyle2["Bottom"] = 7] = "Bottom";
  AlignStyle2[AlignStyle2["BottomRight"] = 8] = "BottomRight";
  return AlignStyle2;
})(AlignStyle || {});
function mapAlignStyle(value) {
  if (value >= 0 /* TopLeft */ && value <= 8 /* BottomRight */) {
    return value;
  }
  throw new Error(`Invalid AlignStyle value: ${value}`);
}
var EffectColor = class _EffectColor {
  constructor(kind, value, colorEffects) {
    this.kind = kind;
    this.value = value;
    this.colorEffects = colorEffects;
  }
  static fromReader(reader) {
    const kind = mapEffectColorKind(reader.readUInt32());
    const value = readEffectColorValue(reader, kind);
    const count = reader.readUInt32();
    const colorEffects = [];
    for (let i = 0; i < count; i++) {
      colorEffects.push(EffectColorEffect.fromReader(reader));
    }
    return new _EffectColor(kind, value, colorEffects);
  }
};
var EffectColorKind = /* @__PURE__ */ ((EffectColorKind2) => {
  EffectColorKind2[EffectColorKind2["RGB"] = 0] = "RGB";
  EffectColorKind2[EffectColorKind2["CMYK"] = 1] = "CMYK";
  EffectColorKind2[EffectColorKind2["Scheme"] = 2] = "Scheme";
  EffectColorKind2[EffectColorKind2["System"] = 3] = "System";
  return EffectColorKind2;
})(EffectColorKind || {});
function mapEffectColorKind(value) {
  if (value >= 0 /* RGB */ && value <= 3 /* System */) {
    return value;
  }
  throw new Error(`Invalid EffectColorKind value: ${value}`);
}
function readEffectColorValue(reader, kind) {
  switch (kind) {
    case 0 /* RGB */:
      return {
        kind,
        value: reader.readUInt32()
      };
    case 1 /* CMYK */:
      return {
        kind,
        value: reader.readUInt32()
      };
    case 2 /* Scheme */:
      return {
        kind,
        value: [
          reader.readFloat32(),
          reader.readFloat32(),
          reader.readFloat32()
        ]
      };
    case 3 /* System */:
      return {
        kind,
        value: [
          reader.readFloat32(),
          reader.readFloat32(),
          reader.readFloat32()
        ]
      };
  }
}
var EffectColorEffectKind = /* @__PURE__ */ ((EffectColorEffectKind2) => {
  EffectColorEffectKind2[EffectColorEffectKind2["Alpha"] = 0] = "Alpha";
  EffectColorEffectKind2[EffectColorEffectKind2["AlphaMod"] = 1] = "AlphaMod";
  EffectColorEffectKind2[EffectColorEffectKind2["AlphaOff"] = 2] = "AlphaOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Red"] = 3] = "Red";
  EffectColorEffectKind2[EffectColorEffectKind2["RedMod"] = 4] = "RedMod";
  EffectColorEffectKind2[EffectColorEffectKind2["RedOff"] = 5] = "RedOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Green"] = 6] = "Green";
  EffectColorEffectKind2[EffectColorEffectKind2["GreenMod"] = 7] = "GreenMod";
  EffectColorEffectKind2[EffectColorEffectKind2["GreenOff"] = 8] = "GreenOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Blue"] = 9] = "Blue";
  EffectColorEffectKind2[EffectColorEffectKind2["BlueMod"] = 10] = "BlueMod";
  EffectColorEffectKind2[EffectColorEffectKind2["BlueOff"] = 11] = "BlueOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Hue"] = 12] = "Hue";
  EffectColorEffectKind2[EffectColorEffectKind2["HueMod"] = 13] = "HueMod";
  EffectColorEffectKind2[EffectColorEffectKind2["HueOff"] = 14] = "HueOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Sat"] = 15] = "Sat";
  EffectColorEffectKind2[EffectColorEffectKind2["SatMod"] = 16] = "SatMod";
  EffectColorEffectKind2[EffectColorEffectKind2["SatOff"] = 17] = "SatOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Lum"] = 18] = "Lum";
  EffectColorEffectKind2[EffectColorEffectKind2["LumMod"] = 19] = "LumMod";
  EffectColorEffectKind2[EffectColorEffectKind2["LumOff"] = 20] = "LumOff";
  EffectColorEffectKind2[EffectColorEffectKind2["Shade"] = 21] = "Shade";
  EffectColorEffectKind2[EffectColorEffectKind2["Tint"] = 22] = "Tint";
  EffectColorEffectKind2[EffectColorEffectKind2["Gray"] = 23] = "Gray";
  EffectColorEffectKind2[EffectColorEffectKind2["Comp"] = 24] = "Comp";
  EffectColorEffectKind2[EffectColorEffectKind2["Gamma"] = 25] = "Gamma";
  EffectColorEffectKind2[EffectColorEffectKind2["InvGamma"] = 26] = "InvGamma";
  EffectColorEffectKind2[EffectColorEffectKind2["Inv"] = 27] = "Inv";
  return EffectColorEffectKind2;
})(EffectColorEffectKind || {});
function mapEffectColorEffectKind(value) {
  if (value >= 0 /* Alpha */ && value <= 27 /* Inv */) {
    return value;
  }
  throw new Error(`Invalid EffectColorEffectKind value: ${value}`);
}
var EffectColorEffect = class _EffectColorEffect {
  constructor(kind, value) {
    this.kind = kind;
    this.value = value;
  }
  static fromReader(reader) {
    return new _EffectColorEffect(
      reader.readUInt32(), // Preserve HWP effect codes (e.g. 0x0204), not ordinal indices.
      reader.readFloat32()
    );
  }
};
var Glow = class _Glow {
  constructor(alpha, radius, color) {
    this.alpha = alpha;
    this.radius = radius;
    this.color = color;
  }
  static fromReader(reader) {
    return new _Glow(
      reader.readFloat32(),
      reader.readFloat32(),
      EffectColor.fromReader(reader)
    );
  }
};
var SoftEdge = class _SoftEdge {
  constructor(radius) {
    this.radius = radius;
  }
  static fromReader(reader) {
    return new _SoftEdge(reader.readFloat32());
  }
};
var Reflection = class _Reflection {
  constructor(align, radius, direction, distance, skewX, skewY, scaleX, scaleY, rotated, startAlpha, startPosition, endAlpha, endPosition, offsetDirection) {
    this.align = align;
    this.radius = radius;
    this.direction = direction;
    this.distance = distance;
    this.skewX = skewX;
    this.skewY = skewY;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.rotated = rotated;
    this.startAlpha = startAlpha;
    this.startPosition = startPosition;
    this.endAlpha = endAlpha;
    this.endPosition = endPosition;
    this.offsetDirection = offsetDirection;
  }
  static fromReader(reader) {
    return new _Reflection(
      mapAlignStyle(reader.readInt32()),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readInt32() > 0,
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32(),
      reader.readFloat32()
    );
  }
};
var PictureAdditionalProperties = class _PictureAdditionalProperties {
  constructor(width, height, alpha) {
    this.width = width;
    this.height = height;
    this.alpha = alpha;
  }
  static fromReader(reader) {
    const width = reader.readUInt32();
    const height = reader.readUInt32();
    const alpha = reader.isEOF() ? 0 : reader.readUInt8();
    return new _PictureAdditionalProperties(
      width,
      height,
      alpha
    );
  }
};

// src/models/controls/shapes/content.ts
function parseContent(elementProperties, current, iterator) {
  switch (elementProperties.ctrlId) {
    case CommonCtrlID.Picture:
      return PictureRecord.fromRecords(iterator);
    default:
      return UnknownControl.fromRecord(current, iterator);
  }
}

// src/models/controls/shapes/shape.ts
var GenShapeObjectControl = class _GenShapeObjectControl {
  constructor(commonProperties, elementProperties, drawText, content) {
    this.commonProperties = commonProperties;
    this.elementProperties = elementProperties;
    this.drawText = drawText;
    this.content = content;
  }
  static fromRecord(record, iterator, version) {
    const commonProperties = CommonProperties.fromRecord(
      record,
      iterator,
      version
    );
    const elementProperties = ElementProperties.fromRecords(iterator, true);
    const drawText = iterator.peek().id === SectionTagID.HWPTAG_LIST_HEADER ? DrawText.fromRecords(iterator, version) : null;
    const content = parseContent(elementProperties, record, iterator);
    return new _GenShapeObjectControl(
      commonProperties,
      elementProperties,
      drawText,
      content
    );
  }
};

// src/models/controls/table.ts
var TableControl = class _TableControl {
  constructor(commonProperties, record, cells) {
    this.commonProperties = commonProperties;
    this.record = record;
    this.cells = cells;
  }
  static fromRecord(record, iterator, version) {
    const commonProperties = CommonProperties.fromRecord(
      record,
      iterator,
      version
    );
    const next = iterator.next();
    if (next.id !== SectionTagID.HWPTAG_TABLE) {
      throw new Error("BodyText: Table: Record has wrong ID");
    }
    const tableRecord = TableRecord.fromRecord(next, version);
    const cells = [];
    const cellCount = tableRecord.rowCounts.reduce(
      (result, current) => result + current
    );
    for (let i = 0; i < cellCount; i++) {
      cells.push(Cell.fromRecords(iterator, version));
    }
    return new _TableControl(commonProperties, tableRecord, cells);
  }
};
var TableRecord = class _TableRecord {
  constructor(pageBreak, repeatHeader, rows, cols, cellSpacing, padding, rowCounts, borderFillId, validZones) {
    this.pageBreak = pageBreak;
    this.repeatHeader = repeatHeader;
    this.rows = rows;
    this.cols = cols;
    this.cellSpacing = cellSpacing;
    this.padding = padding;
    this.rowCounts = rowCounts;
    this.borderFillId = borderFillId;
    this.validZones = validZones;
  }
  static fromRecord(record, version) {
    if (record.id !== SectionTagID.HWPTAG_TABLE) {
      throw new Error("BodyText: Table: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const properties = reader.readUInt32();
    const pageBreak = mapPageBreak(getBitValue(properties, 0, 1));
    const repeatHeader = getFlag(properties, 2);
    const rows = reader.readUInt16();
    const cols = reader.readUInt16();
    const cellSpacing = reader.readInt16();
    const padding = [
      reader.readInt16(),
      reader.readInt16(),
      reader.readInt16(),
      reader.readInt16()
    ];
    const rowCounts = [];
    for (let i = 0; i < rows; i++) {
      rowCounts.push(reader.readUInt16());
    }
    const borderFillId = reader.readUInt16();
    const validZones = [];
    if (version.gte(new HWPVersion(5, 0, 1, 0))) {
      const size = reader.readUInt16();
      for (let i = 0; i < size; i++) {
        validZones.push(ValidZone.fromReader(reader));
      }
    }
    if (!reader.isEOF()) {
      throw new Error("BodyText: Table: Reader is not EOF");
    }
    return new _TableRecord(
      pageBreak,
      repeatHeader,
      rows,
      cols,
      cellSpacing,
      padding,
      rowCounts,
      borderFillId,
      validZones
    );
  }
};
var PageBreak = /* @__PURE__ */ ((PageBreak2) => {
  PageBreak2[PageBreak2["None"] = 0] = "None";
  PageBreak2[PageBreak2["Cell"] = 1] = "Cell";
  PageBreak2[PageBreak2["Table"] = 2] = "Table";
  return PageBreak2;
})(PageBreak || {});
function mapPageBreak(value) {
  if (value >= 0 /* None */ && value <= 2 /* Table */) {
    return value;
  }
  throw new Error(`Unknown PageBreak: ${value}`);
}
var ValidZone = class _ValidZone {
  constructor(startColumn, startRow, endColumn, endRow, borderFillId) {
    this.startColumn = startColumn;
    this.startRow = startRow;
    this.endColumn = endColumn;
    this.endRow = endRow;
    this.borderFillId = borderFillId;
  }
  static fromReader(reader) {
    const startColumn = reader.readUInt16();
    const startRow = reader.readUInt16();
    const endColumn = reader.readUInt16();
    const endRow = reader.readUInt16();
    const borderFillId = reader.readUInt16();
    return new _ValidZone(startColumn, startRow, endColumn, endRow, borderFillId);
  }
};
var Cell = class _Cell {
  constructor(paragraphs, column, row, colSpan, rowSpan, width, height, padding, borderFillId) {
    this.paragraphs = paragraphs;
    this.column = column;
    this.row = row;
    this.colSpan = colSpan;
    this.rowSpan = rowSpan;
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.borderFillId = borderFillId;
  }
  static fromRecords(iterator, version) {
    const record = iterator.next();
    if (record.id !== SectionTagID.HWPTAG_LIST_HEADER) {
      throw new Error("BodyText: Cell: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const paragraphs = ParagraphList.fromReader(reader, iterator, version);
    const column = reader.readUInt16();
    const row = reader.readUInt16();
    const colSpan = reader.readUInt16();
    const rowSpan = reader.readUInt16();
    const width = reader.readUInt32();
    const height = reader.readUInt32();
    const padding = [
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16()
    ];
    const borderFillId = reader.readUInt16() - 1;
    reader.read(reader.remainByte());
    return new _Cell(
      paragraphs,
      column,
      row,
      colSpan,
      rowSpan,
      width,
      height,
      padding,
      borderFillId
    );
  }
};

// src/models/controls/content.ts
function parseControl(ctrlId, current, iterator, version) {
  switch (ctrlId) {
    case OtherCtrlID.Section:
      return SectionControl.fromRecord(current, iterator, version);
    case CommonCtrlID.Table:
      return TableControl.fromRecord(current, iterator, version);
    case CommonCtrlID.GenShapeObject:
      return GenShapeObjectControl.fromRecord(current, iterator, version);
    default:
      return UnknownControl.fromRecord(current, iterator);
  }
}

// src/models/controls/index.ts
var Control = class _Control {
  constructor(id, content) {
    this.id = id;
    this.content = content;
  }
  static fromRecords(iterator, version) {
    const current = iterator.next();
    if (current.id !== SectionTagID.HWPTAG_CTRL_HEADER) {
      throw new Error("Control: Record has wrong ID");
    }
    const reader = new ByteReader(current.data);
    const id = reader.readUInt32();
    const content = parseControl(id, current, iterator, version);
    return new _Control(id, content);
  }
};

// src/models/section.ts
var inflate = (...args) => globalThis.pako.inflate(...args);

// src/utils/generator.ts
var PeekableIterator = class {
  constructor(generator) {
    this.generator = generator;
  }
  [Symbol.iterator]() {
    return this.next();
  }
  waiting;
  next() {
    if (this.waiting) {
      if (this.waiting.done) {
        throw new Error("Generator is done");
      }
      const value = this.waiting.value;
      this.waiting = void 0;
      return value;
    }
    const next = this.generator.next();
    if (next.done) {
      throw new Error("Generator is done");
    }
    return next.value;
  }
  peek() {
    if (!this.waiting) {
      this.waiting = this.generator.next();
    }
    if (this.waiting.done) {
      throw new Error("Generator is done");
    }
    return this.waiting.value;
  }
  isDone() {
    if (!this.waiting) {
      this.waiting = this.generator.next();
    }
    return this.waiting.done ?? false;
  }
};

// src/models/section.ts
var Section = class _Section {
  constructor(paragraphs) {
    this.paragraphs = paragraphs;
  }
  static fromEntry(entry, header) {
    const content = Uint8Array.from(entry.content);
    if (header.flags.compressed) {
      const decoded = inflate(content, { windowBits: -15 });
      return _Section.fromBuffer(decoded.buffer, header);
    }
    return _Section.fromBuffer(content.buffer, header);
  }
  static fromBuffer(buffer, header) {
    const reader = new ByteReader(buffer);
    const records = new PeekableIterator(reader.records());
    const paragraphs = [];
    while (!records.isDone()) {
      paragraphs.push(Paragraph.fromRecord(records, header.version));
    }
    return new _Section(paragraphs);
  }
};

// src/models/document.ts
var { find : find3, read } = globalThis.CFB;

// src/models/doc-info/doc-info.ts
var { find } = globalThis.CFB;
var inflate2 = (...args) => globalThis.pako.inflate(...args);

// src/models/doc-info/properties.ts
var Properties = class _Properties {
  constructor(sections, pageStartNumber, footnoteStartNumber, endnoteStartNumber, pictureStartNumber, tableStartNumber, formulaStartNumber, listId, paragraphId, characterInParagraph) {
    this.sections = sections;
    this.pageStartNumber = pageStartNumber;
    this.footnoteStartNumber = footnoteStartNumber;
    this.endnoteStartNumber = endnoteStartNumber;
    this.pictureStartNumber = pictureStartNumber;
    this.tableStartNumber = tableStartNumber;
    this.formulaStartNumber = formulaStartNumber;
    this.listId = listId;
    this.paragraphId = paragraphId;
    this.characterInParagraph = characterInParagraph;
  }
  static fromRecord(record) {
    const reader = new ByteReader(record.data);
    const properties = new _Properties(
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt32(),
      reader.readUInt32(),
      reader.readUInt32()
    );
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Properties: Reader is not EOF");
    }
    return properties;
  }
};

// src/models/doc-info/bin-data.ts
var BinDataProperties = class _BinDataProperties {
  constructor(kind, compressMode, status) {
    this.kind = kind;
    this.compressMode = compressMode;
    this.status = status;
  }
  static fromBits(bits) {
    return new _BinDataProperties(
      mapBinDataKind(getBitValue(bits, 0, 3)),
      mapCompressMode(getBitValue(bits, 4, 5)),
      mapBinDataStatus(getBitValue(bits, 8, 9))
    );
  }
};
var BinData = class _BinData {
  constructor(properties) {
    this.properties = properties;
  }
  absolutePath;
  relativePath;
  id;
  extension;
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_BIN_DATA) {
      throw new Error("DocInfo: BinData: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const properties = BinDataProperties.fromBits(reader.readUInt16());
    const binData = new _BinData(properties);
    if (properties.kind === 0 /* Link */) {
      binData.absolutePath = reader.readString();
      binData.relativePath = reader.readString();
    }
    if (properties.kind === 1 /* Embedding */) {
      binData.id = reader.readUInt16();
      binData.extension = reader.readString();
    }
    if (properties.kind === 2 /* Storage */) {
      binData.id = reader.readUInt16();
      if (!reader.isEOF()) binData.extension = reader.readString();
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: BinData: Reader is not EOF");
    }
    return binData;
  }
  getCFBFileName() {
    var _a, _b;
    if (this.properties.kind !== 1 /* Embedding */) {
      return null;
    }
    const extension = (_a = this.extension) == null ? void 0 : _a.toLowerCase();
    const id = (_b = this.id) == null ? void 0 : _b.toString(16).padStart(4, "0");
    return `BIN${id}.${extension}`;
  }
  compressed(header) {
    switch (this.properties.compressMode) {
      case 0 /* Default */:
        return header.flags.compressed;
      case 1 /* Compress */:
        return true;
      case 2 /* None */:
        return false;
    }
  }
};
function mapBinDataKind(value) {
  if (value >= 0 /* Link */ && value <= 2 /* Storage */) {
    return value;
  }
  throw new Error(`Unknown BinDataKind: ${value}`);
}
function mapCompressMode(value) {
  if (value >= 0 /* Default */ && value <= 2 /* None */) {
    return value;
  }
  throw new Error(`Unknown CompressMode: ${value}`);
}
function mapBinDataStatus(value) {
  if (value >= 0 /* Initial */ && value <= 3 /* Ignored */) {
    return value;
  }
  throw new Error(`Unknown BinDataStatus: ${value}`);
}

// src/models/doc-info/panose.ts
var Panose = class {
  constructor(kind, serifStyle, weight, proportion, contrast, strokeVariation, armStyle, letterform, midline, xHeight) {
    this.kind = kind;
    this.serifStyle = serifStyle;
    this.weight = weight;
    this.proportion = proportion;
    this.contrast = contrast;
    this.strokeVariation = strokeVariation;
    this.armStyle = armStyle;
    this.letterform = letterform;
    this.midline = midline;
    this.xHeight = xHeight;
  }
};

// src/models/doc-info/font-face.ts
var FontFace = class _FontFace {
  constructor(name) {
    this.name = name;
  }
  /** 기본 글꼴 이름 */
  defaultFontName;
  /** 글꼴유형정보 */
  panose;
  /** 대체 글꼴 유형 */
  alternativeKind;
  /** 대체 글꼴 이름 */
  alternativeFontName;
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_FACE_NAME) {
      throw new Error("DocInfo: Font: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const properties = reader.readUInt8();
    const name = reader.readString();
    const hasAlternative = getFlag(properties, 7);
    const hasPanose = getFlag(properties, 6);
    const hasDefaultFont = getFlag(properties, 5);
    const font = new _FontFace(name);
    if (hasAlternative) {
      font.alternativeKind = mapAlternativeKind(reader.readUInt8());
      font.alternativeFontName = reader.readString();
    }
    if (hasPanose) {
      font.panose = new Panose(
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8(),
        reader.readUInt8()
      );
    }
    if (hasDefaultFont) {
      font.defaultFontName = reader.readString();
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Font: Reader is not EOF");
    }
    return font;
  }
};
function mapAlternativeKind(value) {
  if (value >= 0 /* Unknown */ && value <= 2 /* HFT */) {
    return value;
  }
  throw new Error(`Unknown AlternativeKind: ${value}`);
}

// src/models/doc-info/char-shape.ts
var CharShapeStyle = class _CharShapeStyle {
  constructor(fontIds, fontScales, fontSpacings, fontSizes, fontPositions, fontBaseSize, italic, bold, underlineKind, underlineShape, outlineKind, shadowKind, emboss, engrave, supscript, subscript, strike, symMark, useFontSpace, strikeShape, useKerning, shadowOffsetX, shadowOffsetY, color, underlineColor, shadeColor, shadowColor) {
    this.fontIds = fontIds;
    this.fontScales = fontScales;
    this.fontSpacings = fontSpacings;
    this.fontSizes = fontSizes;
    this.fontPositions = fontPositions;
    this.fontBaseSize = fontBaseSize;
    this.italic = italic;
    this.bold = bold;
    this.underlineKind = underlineKind;
    this.underlineShape = underlineShape;
    this.outlineKind = outlineKind;
    this.shadowKind = shadowKind;
    this.emboss = emboss;
    this.engrave = engrave;
    this.supscript = supscript;
    this.subscript = subscript;
    this.strike = strike;
    this.symMark = symMark;
    this.useFontSpace = useFontSpace;
    this.strikeShape = strikeShape;
    this.useKerning = useKerning;
    this.shadowOffsetX = shadowOffsetX;
    this.shadowOffsetY = shadowOffsetY;
    this.color = color;
    this.underlineColor = underlineColor;
    this.shadeColor = shadeColor;
    this.shadowColor = shadowColor;
  }
  /** 글자 테두리/배경ID 참조 값 (5.0.2.1 이상) */
  borderFillId;
  /** 취소선 색 (5.0.3.0 이상) */
  strikeColor;
  static fromRecord(record, version) {
    if (record.id !== DocInfoTagID.HWPTAG_CHAR_SHAPE) {
      throw new Error("DocInfo: CharShape: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const fontIds = [
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16(),
      reader.readUInt16()
    ];
    const fontScales = [
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8()
    ];
    const fontSpacings = [
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8()
    ];
    const fontSizes = [
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8(),
      reader.readUInt8()
    ];
    const fontPositions = [
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8(),
      reader.readInt8()
    ];
    const baseSize = reader.readInt32();
    const attribute = reader.readUInt32();
    const italic = getFlag(attribute, 0);
    const bold = getFlag(attribute, 1);
    const underlineKind = mapUnderlineKind(getBitValue(attribute, 2, 3));
    const underlineShape = mapBorderKind(getBitValue(attribute, 4, 7));
    const outlineKind = mapOutlineKind(getBitValue(attribute, 8, 10));
    const shadowKind = mapShadowKind2(getBitValue(attribute, 11, 12));
    const emboss = getFlag(attribute, 13);
    const engrave = getFlag(attribute, 14);
    const supscript = getFlag(attribute, 15);
    const subscript = getFlag(attribute, 16);
    const strike = getBitValue(attribute, 18, 20) > 0;
    const symMark = mapSymMark(getBitValue(attribute, 21, 24));
    const useFontSpace = getFlag(attribute, 25);
    const strikeShape = mapBorderKind(getBitValue(attribute, 26, 29));
    const useKerning = getFlag(attribute, 30);
    const shadowOffsetX = reader.readUInt8();
    const shadowOffsetY = reader.readUInt8();
    const color = ColorRef.fromBits(reader.readUInt32());
    const underlineColor = ColorRef.fromBits(reader.readUInt32());
    const shadeColor = ColorRef.fromBits(reader.readUInt32());
    const shadowColor = ColorRef.fromBits(reader.readUInt32());
    const charShape = new _CharShapeStyle(
      fontIds,
      fontScales,
      fontSpacings,
      fontSizes,
      fontPositions,
      baseSize,
      italic,
      bold,
      underlineKind,
      underlineShape,
      outlineKind,
      shadowKind,
      emboss,
      engrave,
      supscript,
      subscript,
      strike,
      symMark,
      useFontSpace,
      strikeShape,
      useKerning,
      shadowOffsetX,
      shadowOffsetY,
      color,
      underlineColor,
      shadeColor,
      shadowColor
    );
    if (version.gte(new HWPVersion(5, 0, 2, 1))) {
      charShape.borderFillId = reader.readUInt16();
    }
    if (version.gte(new HWPVersion(5, 0, 3, 0))) {
      charShape.strikeColor = ColorRef.fromBits(reader.readUInt32());
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: CharShape: Reader is not EOF");
    }
    return charShape;
  }
};
function mapUnderlineKind(value) {
  if (value >= 0 /* None */ && value <= 2 /* Top */) {
    return value;
  }
  throw new Error(`Unknown UnderlineKind: ${value}`);
}
function mapOutlineKind(value) {
  if (value >= 0 /* None */ && value <= 6 /* DashDotDot */) {
    return value;
  }
  throw new Error(`Unknown OutlineKind: ${value}`);
}
function mapShadowKind2(value) {
  if (value >= 0 /* None */ && value <= 2 /* Continuous */) {
    return value;
  }
  throw new Error(`Unknown CharShadowKind: ${value}`);
}
function mapSymMark(value) {
  if (value >= 0 /* None */ && value <= 6 /* Colon */) {
    return value;
  }
  throw new Error(`Unknown SymMark: ${value}`);
}

// src/models/doc-info/tab-definition.ts
var TabDefinition = class _TabDefinition {
  constructor(leftTab, rightTab, tabInfos) {
    this.leftTab = leftTab;
    this.rightTab = rightTab;
    this.tabInfos = tabInfos;
  }
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_TAB_DEF) {
      throw new Error("DocInfo: TabDefinition: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const attribute = reader.readUInt32();
    const leftTab = getFlag(attribute, 0);
    const rightTab = getFlag(attribute, 1);
    const count = reader.readUInt32();
    const tabInfos = [];
    for (let i = 0; i < count; i++) {
      tabInfos.push(TabInfo.fromReader(reader));
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: TabDefinition: Reader is not EOF");
    }
    return new _TabDefinition(leftTab, rightTab, tabInfos);
  }
};
var TabInfo = class _TabInfo {
  constructor(position, kind, borderKind) {
    this.position = position;
    this.kind = kind;
    this.borderKind = borderKind;
  }
  static fromReader(reader) {
    const position = reader.readUInt32();
    const kind = reader.readUInt8();
    const borderKind = reader.readUInt8();
    reader.readUInt16();
    return new _TabInfo(position, kind, borderKind);
  }
};

// src/models/doc-info/paragraph-shape.ts
var ParagraphShape = class _ParagraphShape {
  constructor(lineSpaceKindOld, align, breakLatinWord, breakNonLatinWord, snapToGrid, condense, widowOrphan, keepWithNext, keepLines, pageBreakBefore, verticalAlign, fontLineHeight, headingKind, headingLevel, borderConnect, borderIgnoreMargin, tailing, paddingLeft, paddingRight, indent, marginTop, marginBottom, lineSpaceOld, tabDefinitionId, numberingBulletId, borderFillId, borderOffsetLeft, borderOffsetRight, borderOffsetTop, borderOffsetBottom) {
    this.lineSpaceKindOld = lineSpaceKindOld;
    this.align = align;
    this.breakLatinWord = breakLatinWord;
    this.breakNonLatinWord = breakNonLatinWord;
    this.snapToGrid = snapToGrid;
    this.condense = condense;
    this.widowOrphan = widowOrphan;
    this.keepWithNext = keepWithNext;
    this.keepLines = keepLines;
    this.pageBreakBefore = pageBreakBefore;
    this.verticalAlign = verticalAlign;
    this.fontLineHeight = fontLineHeight;
    this.headingKind = headingKind;
    this.headingLevel = headingLevel;
    this.borderConnect = borderConnect;
    this.borderIgnoreMargin = borderIgnoreMargin;
    this.tailing = tailing;
    this.paddingLeft = paddingLeft;
    this.paddingRight = paddingRight;
    this.indent = indent;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.lineSpaceOld = lineSpaceOld;
    this.tabDefinitionId = tabDefinitionId;
    this.numberingBulletId = numberingBulletId;
    this.borderFillId = borderFillId;
    this.borderOffsetLeft = borderOffsetLeft;
    this.borderOffsetRight = borderOffsetRight;
    this.borderOffsetTop = borderOffsetTop;
    this.borderOffsetBottom = borderOffsetBottom;
  }
  /** 한 줄로 입력 여부 (5.0.1.7 버전 이상) */
  singleLine;
  /** 한글과 영어 간격을 자동 조절 여부 (5.0.1.7 버전 이상) */
  autoSpacingKrEng;
  /** 한글과 숫자 간격을 자동 조절 여부 (5.0.1.7 버전 이상) */
  autoSpacingKrNum;
  /** 줄 간격 종류 (5.0.2.5 버전 이상) */
  lineSpacingKind;
  /** 줄 간격 (5.0.2.5 버전 이상) */
  lineSpacing;
  /** 개요 수준 (5.1.0.0 버전 이상) */
  paraLevel;
  static fromRecord(record, version) {
    if (record.id !== DocInfoTagID.HWPTAG_PARA_SHAPE) {
      throw new Error("DocInfo: ParagraphShape: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const attribute = reader.readUInt32();
    const lineSpaceKindOld = mapLineSpacingKind(getBitValue(attribute, 0, 1));
    const align = mapAlign2(getBitValue(attribute, 2, 4));
    const breakLatinWord = mapBreakLatinWord(getBitValue(attribute, 5, 6));
    const breakNonLatinWord = mapBreakNonLatinWord(getBitValue(attribute, 7, 7));
    const snapToGrid = getFlag(attribute, 8);
    const condense = getBitValue(attribute, 9, 15);
    const widowOrphan = getFlag(attribute, 16);
    const keepWithNext = getFlag(attribute, 17);
    const keepLines = getFlag(attribute, 18);
    const pageBreakBefore = getFlag(attribute, 19);
    const verticalAlign = mapVerticalAlign2(getBitValue(attribute, 20, 21));
    const fontLineHeight = getFlag(attribute, 22);
    const headingKind = mapParagraphHeadingKind(getBitValue(attribute, 23, 24));
    const headingLevel = getBitValue(attribute, 25, 27);
    const borderConnect = getFlag(attribute, 28);
    const borderIgnoreMargin = getFlag(attribute, 29);
    const tailing = getBitValue(attribute, 30, 30);
    const paddingLeft = reader.readInt32();
    const paddingRight = reader.readInt32();
    const indent = reader.readInt32();
    const marginTop = reader.readInt32();
    const marginBottom = reader.readInt32();
    const lineSpaceOld = reader.readInt32();
    const tabDefinitionId = reader.readUInt16();
    const numberingBulletId = reader.readUInt16();
    const borderFillId = reader.readUInt16();
    const borderOffsetLeft = reader.readInt16();
    const borderOffsetRight = reader.readInt16();
    const borderOffsetTop = reader.readInt16();
    const borderOffsetBottom = reader.readInt16();
    const paragraphShape = new _ParagraphShape(
      lineSpaceKindOld,
      align,
      breakLatinWord,
      breakNonLatinWord,
      snapToGrid,
      condense,
      widowOrphan,
      keepWithNext,
      keepLines,
      pageBreakBefore,
      verticalAlign,
      fontLineHeight,
      headingKind,
      headingLevel,
      borderConnect,
      borderIgnoreMargin,
      tailing,
      paddingLeft,
      paddingRight,
      indent,
      marginTop,
      marginBottom,
      lineSpaceOld,
      tabDefinitionId,
      numberingBulletId,
      borderFillId,
      borderOffsetLeft,
      borderOffsetRight,
      borderOffsetTop,
      borderOffsetBottom
    );
    if (version.gte(new HWPVersion(5, 0, 1, 7))) {
      const attributeV2 = reader.readUInt32();
      paragraphShape.singleLine = getBitValue(attributeV2, 0, 1) > 0;
      paragraphShape.autoSpacingKrEng = getFlag(attributeV2, 4);
      paragraphShape.autoSpacingKrNum = getFlag(attributeV2, 5);
    }
    if (version.gte(new HWPVersion(5, 0, 2, 5))) {
      const attributeV3 = reader.readUInt32();
      paragraphShape.lineSpacingKind = mapLineSpacingKind(
        getBitValue(attributeV3, 0, 4)
      );
      paragraphShape.lineSpacing = reader.readUInt32();
    }
    if (version.gte(new HWPVersion(5, 1, 0, 0))) {
      paragraphShape.paraLevel = reader.readUInt32();
    }
    if (!reader.isEOF()) {
      throw new Error("DocInfo: ParagraphShape: Reader is not EOF");
    }
    return paragraphShape;
  }
};
function mapAlign2(value) {
  if (value >= 0 /* Justify */ && value <= 5 /* DistributiveSpace */) {
    return value;
  }
  throw new Error(`Unknown Align: ${value}`);
}
function mapBreakLatinWord(value) {
  if (value >= 0 /* KeepWord */ && value <= 2 /* BreakWord */) {
    return value;
  }
  throw new Error(`Unknown BreakLatinWord: ${value}`);
}
function mapBreakNonLatinWord(value) {
  if (value >= 0 /* KeepWord */ && value <= 1 /* BreakWord */) {
    return value;
  }
  throw new Error(`Unknown BreakNonLatinWord: ${value}`);
}
function mapVerticalAlign2(value) {
  if (value >= 0 /* Baseline */ && value <= 3 /* Bottom */) {
    return value;
  }
  throw new Error(`Unknown VerticalAlign: ${value}`);
}
function mapParagraphHeadingKind(value) {
  if (value >= 0 /* None */ && value <= 3 /* Bullet */) {
    return value;
  }
  throw new Error(`Unknown ParagraphHeadingKind: ${value}`);
}
function mapLineSpacingKind(value) {
  if (value >= 0 /* Percent */ && value <= 3 /* AtLeast */) {
    return value;
  }
  throw new Error(`Unknown LineSpacingKind: ${value}`);
}

// src/models/doc-info/style.ts
var Style = class _Style {
  constructor(name, englishName, kind, nextStyleId, langId, paragraphShapeId, charShapeId, lockForm) {
    this.name = name;
    this.englishName = englishName;
    this.kind = kind;
    this.nextStyleId = nextStyleId;
    this.langId = langId;
    this.paragraphShapeId = paragraphShapeId;
    this.charShapeId = charShapeId;
    this.lockForm = lockForm;
  }
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_STYLE) {
      throw new Error("DocInfo: Style: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const name = reader.readString();
    const englishName = reader.readString();
    const kind = mapStyleKind(reader.readUInt8());
    const nextStyleId = reader.readUInt8();
    const langId = reader.readUInt16();
    const paragraphShapeId = reader.readUInt16();
    const charShapeId = reader.readUInt16();
    const lockForm = reader.readUInt16();
    if (!reader.isEOF()) {
      throw new Error("DocInfo: Style: Reader is not EOF");
    }
    return new _Style(
      name,
      englishName,
      kind,
      nextStyleId,
      langId,
      paragraphShapeId,
      charShapeId,
      lockForm
    );
  }
};
function mapStyleKind(value) {
  if (value >= 0 /* Para */ && value <= 1 /* Char */) {
    return value;
  }
  throw new Error(`Unknown StyleKind: ${value}`);
}

// src/models/doc-info/memo-shape.ts
var MemoShape = class _MemoShape {
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_MEMO_SHAPE) {
      throw new Error("DocInfo: MemoShape: Record has wrong ID");
    }
    return new _MemoShape();
  }
};

// src/models/doc-info/change-tracking.ts
var ChangeTracking = class _ChangeTracking {
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_TRACK_CHANGE) {
      throw new Error("DocInfo: ChangeTracking: Record has wrong ID");
    }
    return new _ChangeTracking();
  }
};

// src/models/doc-info/change-tracking-author.ts
var ChangeTrackingAuthor = class _ChangeTrackingAuthor {
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_TRACK_CHANGE_AUTHOR) {
      throw new Error("DocInfo: ChangeTrackingAuthor: Record has wrong ID");
    }
    return new _ChangeTrackingAuthor();
  }
};

// src/models/doc-info/id-mappings.ts
var MEMO_SUPPORTED_VERSION = new HWPVersion(5, 0, 2, 1);
var TRACKING_SUPPORTED_VERSION = new HWPVersion(5, 0, 3, 2);
var IDMappings = class _IDMappings {
  constructor(binaryData, koreanFonts, englishFonts, chineseCharactersFonts, japaneseFonts, etcFonts, symbolFonts, userFonts, borderFills, charShapes, tabDefinitions, numberings, bullets, paragraphShapes, styles, memoShapes, changeTrackings, changeTrackingAuthors) {
    this.binaryData = binaryData;
    this.koreanFonts = koreanFonts;
    this.englishFonts = englishFonts;
    this.chineseCharactersFonts = chineseCharactersFonts;
    this.japaneseFonts = japaneseFonts;
    this.etcFonts = etcFonts;
    this.symbolFonts = symbolFonts;
    this.userFonts = userFonts;
    this.borderFills = borderFills;
    this.charShapes = charShapes;
    this.tabDefinitions = tabDefinitions;
    this.numberings = numberings;
    this.bullets = bullets;
    this.paragraphShapes = paragraphShapes;
    this.styles = styles;
    this.memoShapes = memoShapes;
    this.changeTrackings = changeTrackings;
    this.changeTrackingAuthors = changeTrackingAuthors;
  }
  static fromRecords(records, version) {
    const record = records.next().value;
    if (record.id !== DocInfoTagID.HWPTAG_ID_MAPPINGS) {
      throw new Error("DocInfo: IDMappings: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const binaryDataCount = reader.readInt32();
    const koreanFontsCount = reader.readInt32();
    const englishFontsCount = reader.readInt32();
    const chineseCharactersFontsCount = reader.readInt32();
    const japaneseFontsCount = reader.readInt32();
    const etcFontsCount = reader.readInt32();
    const symbolFontsCount = reader.readInt32();
    const userFontsCount = reader.readInt32();
    const borderFillsCount = reader.readInt32();
    const charShapesCount = reader.readInt32();
    const tabDefinitionsCount = reader.readInt32();
    const numberingsCount = reader.readInt32();
    const bulletsCount = reader.readInt32();
    const paragraphShapesCount = reader.readInt32();
    const stylesCount = reader.readInt32();
    const memoShapesCount = version.gte(MEMO_SUPPORTED_VERSION) ? reader.readInt32() : 0;
    const changeTrackingsCount = version.gte(TRACKING_SUPPORTED_VERSION) ? reader.readInt32() : 0;
    const changeTrackingAuthorsCount = version.gte(TRACKING_SUPPORTED_VERSION) ? reader.readInt32() : 0;
    if (!reader.isEOF()) {
      throw new Error("DocInfo: IDMappings: Reader is not EOF");
    }
    return new _IDMappings(
      readItems(records, binaryDataCount, version, BinData.fromRecord),
      readItems(records, koreanFontsCount, version, FontFace.fromRecord),
      readItems(records, englishFontsCount, version, FontFace.fromRecord),
      readItems(
        records,
        chineseCharactersFontsCount,
        version,
        FontFace.fromRecord
      ),
      readItems(records, japaneseFontsCount, version, FontFace.fromRecord),
      readItems(records, etcFontsCount, version, FontFace.fromRecord),
      readItems(records, symbolFontsCount, version, FontFace.fromRecord),
      readItems(records, userFontsCount, version, FontFace.fromRecord),
      readItems(records, borderFillsCount, version, BorderFill.fromRecord),
      readItems(records, charShapesCount, version, CharShapeStyle.fromRecord),
      readItems(
        records,
        tabDefinitionsCount,
        version,
        TabDefinition.fromRecord
      ),
      readItems(records, numberingsCount, version, Numbering.fromRecord),
      readItems(records, bulletsCount, version, Bullet.fromRecord),
      readItems(
        records,
        paragraphShapesCount,
        version,
        ParagraphShape.fromRecord
      ),
      readItems(records, stylesCount, version, Style.fromRecord),
      readItems(records, memoShapesCount, version, MemoShape.fromRecord),
      readItems(
        records,
        changeTrackingsCount,
        version,
        ChangeTracking.fromRecord
      ),
      readItems(
        records,
        changeTrackingAuthorsCount,
        version,
        ChangeTrackingAuthor.fromRecord
      )
    );
  }
  *embeddings() {
    for (const binData of this.binaryData) {
      if (binData.properties.kind === 1 /* Embedding */) {
        yield binData;
      }
    }
  }
};

// src/models/doc-info/layout-compatibility.ts
var LayoutCompatibility = class _LayoutCompatibility {
  constructor(char, paragraph, section, object, field) {
    this.char = char;
    this.paragraph = paragraph;
    this.section = section;
    this.object = object;
    this.field = field;
  }
  static fromRecord(record) {
    if (record.id !== DocInfoTagID.HWPTAG_LAYOUT_COMPATIBILITY) {
      throw new Error("DocInfo: LayoutCompatibility: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const char = reader.readUInt32();
    const paragraph = reader.readUInt32();
    const section = reader.readUInt32();
    const object = reader.readUInt32();
    const field = reader.readUInt32();
    if (!reader.isEOF()) {
      throw new Error("DocInfo: LayoutCompatibility: Reader is not EOF");
    }
    return new _LayoutCompatibility(char, paragraph, section, object, field);
  }
};

// src/models/doc-info/compatible-document.ts
var CompatibleDocument = class _CompatibleDocument {
  constructor(targetProgram, layoutCompatibility) {
    this.targetProgram = targetProgram;
    this.layoutCompatibility = layoutCompatibility;
  }
  static fromRecords(record, records) {
    if (record.id !== DocInfoTagID.HWPTAG_COMPATIBLE_DOCUMENT) {
      throw new Error("DocInfo: CompatibleDocument: Record has wrong ID");
    }
    const reader = new ByteReader(record.data);
    const targetProgram = mapTargetProgram(reader.readUInt32());
    if (!reader.isEOF()) {
      throw new Error("DocInfo: CompatibleDocument: Reader is not EOF");
    }
    const next = records.next();
    if (next.done) {
      throw new Error("Unexpected EOF");
    }
    const layoutCompatibility = LayoutCompatibility.fromRecord(next.value);
    return new _CompatibleDocument(targetProgram, layoutCompatibility);
  }
};
function mapTargetProgram(value) {
  if (value >= 0 /* HWP201X */ && value <= 2 /* MSWord */) {
    return value;
  }
  throw new Error(`Unknown TargetProgram: ${value}`);
}

// src/models/doc-info/doc-info.ts
var DocInfo = class _DocInfo {
  constructor(properties, idMappings) {
    this.properties = properties;
    this.idMappings = idMappings;
  }
  compatibleDocument;
  static fromCfbContainer(container, header) {
    const docInfoEntry = find(container, "DocInfo");
    if (!docInfoEntry) {
      throw new Error("DocInfo not exist");
    }
    const content = Uint8Array.from(docInfoEntry.content);
    if (header.flags.compressed) {
      const decodedContent = inflate2(content, {
        windowBits: -15
      });
      return _DocInfo.fromBytes(decodedContent, header.version);
    }
    return _DocInfo.fromBytes(content, header.version);
  }
  static fromBytes(bytes, version) {
    const reader = new ByteReader(bytes.buffer);
    const records = reader.records();
    const properties = Properties.fromRecord(records.next().value);
    const idMappings = IDMappings.fromRecords(records, version);
    const info = new _DocInfo(properties, idMappings);
    while (true) {
      const current = records.next();
      if (current.done) {
        break;
      }
      switch (current.value.id) {
        case DocInfoTagID.HWPTAG_COMPATIBLE_DOCUMENT:
          info.compatibleDocument = CompatibleDocument.fromRecords(
            current.value,
            records
          );
          break;
      }
    }
    return info;
  }
};

// src/models/header.ts
var { find : find2 } = globalThis.CFB;
var SIGNATURE = "HWP Document File";
var FILE_HEADER_BYTES = 256;
var HWPHeader = class _HWPHeader {
  constructor(version, flags, license, encryptVersion, kogl, reserved) {
    this.version = version;
    this.flags = flags;
    this.license = license;
    this.encryptVersion = encryptVersion;
    this.kogl = kogl;
    this.reserved = reserved;
  }
  static fromCfbContainer(container) {
    const fileHeader = find2(container, "FileHeader");
    if (!fileHeader) {
      throw new Error("Cannot find FileHeader");
    }
    const reader = new ByteReader(Uint8Array.from(fileHeader.content).buffer);
    return _HWPHeader.fromByteReader(reader);
  }
  static fromByteReader(reader) {
    if (reader.length() !== FILE_HEADER_BYTES) {
      throw new Error(
        `FileHeader must be ${FILE_HEADER_BYTES} bytes, Received: ${reader.length()}`
      );
    }
    const signature = new TextDecoder().decode(reader.read(17));
    if (signature !== SIGNATURE) {
      throw new Error(
        `hwp file's signature should be ${SIGNATURE}. Received version: ${signature}`
      );
    }
    reader.read(15);
    const revision = reader.readUInt8();
    const build = reader.readUInt8();
    const minor = reader.readUInt8();
    const major = reader.readUInt8();
    const version = new HWPVersion(major, minor, build, revision);
    const flags = Flags.fromBits(reader.readUInt32());
    const license = License.fromBits(reader.readUInt32());
    const encryptVersion = mapEncryptVersion(reader.readInt32());
    const kogl = mapKogl(reader.readUInt8());
    const reserved = reader.read(207);
    if (!reader.isEOF()) {
      throw new Error("FileHeader is not EOF");
    }
    return new _HWPHeader(
      version,
      flags,
      license,
      encryptVersion,
      kogl,
      reserved
    );
  }
};
var Flags = class _Flags {
  constructor(compressed, encrypted, distributed, script, drm, xmlTemplateStorage, vcs, electronicSignatured, certificateEncrypted, prepareSignatured, certificateDrm, ccl, mobileOptimized, privacySecurityDocument, trackChanges, kogl, videoControl, orderFieldControl) {
    this.compressed = compressed;
    this.encrypted = encrypted;
    this.distributed = distributed;
    this.script = script;
    this.drm = drm;
    this.xmlTemplateStorage = xmlTemplateStorage;
    this.vcs = vcs;
    this.electronicSignatured = electronicSignatured;
    this.certificateEncrypted = certificateEncrypted;
    this.prepareSignatured = prepareSignatured;
    this.certificateDrm = certificateDrm;
    this.ccl = ccl;
    this.mobileOptimized = mobileOptimized;
    this.privacySecurityDocument = privacySecurityDocument;
    this.trackChanges = trackChanges;
    this.kogl = kogl;
    this.videoControl = videoControl;
    this.orderFieldControl = orderFieldControl;
  }
  static fromBits(bits) {
    return new _Flags(
      Boolean(getBitValue(bits, 0)),
      Boolean(getBitValue(bits, 1)),
      Boolean(getBitValue(bits, 2)),
      Boolean(getBitValue(bits, 3)),
      Boolean(getBitValue(bits, 4)),
      Boolean(getBitValue(bits, 5)),
      Boolean(getBitValue(bits, 6)),
      Boolean(getBitValue(bits, 7)),
      Boolean(getBitValue(bits, 8)),
      Boolean(getBitValue(bits, 9)),
      Boolean(getBitValue(bits, 10)),
      Boolean(getBitValue(bits, 11)),
      Boolean(getBitValue(bits, 12)),
      Boolean(getBitValue(bits, 13)),
      Boolean(getBitValue(bits, 14)),
      Boolean(getBitValue(bits, 15)),
      Boolean(getBitValue(bits, 16)),
      Boolean(getBitValue(bits, 17))
    );
  }
};
var License = class _License {
  constructor(ccl, replicationRestrictions, replicationAlike, reserved) {
    this.ccl = ccl;
    this.replicationRestrictions = replicationRestrictions;
    this.replicationAlike = replicationAlike;
    this.reserved = reserved;
  }
  static fromBits(bits) {
    return new _License(
      Boolean(getBitValue(bits, 0)),
      Boolean(getBitValue(bits, 1)),
      Boolean(getBitValue(bits, 2)),
      getBitValue(bits, 3, 32)
    );
  }
};
function mapEncryptVersion(byte) {
  switch (byte) {
    case 0:
      return 0 /* None */;
    case 1:
      return 1 /* HWP2_5 */;
    case 2:
      return 2 /* HWP3Enhanced */;
    case 3:
      return 3 /* HWP3Old */;
    case 4:
      return 4 /* HWP7 */;
    default:
      throw new Error(`Unknown encrypt version: ${byte}`);
  }
}
function mapKogl(byte) {
  switch (byte) {
    case 0:
      return 0 /* None */;
    case 6:
      return 6 /* KOR */;
    case 15:
      return 15 /* US */;
    default:
      throw new Error(`Unknown KOGL: ${byte}`);
  }
}

// src/models/bin-data.ts
var BinData2 = class {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }
};

// src/models/document.ts
var inflate3 = (...args) => globalThis.pako.inflate(...args);
var HWPDocument = class _HWPDocument {
  constructor(header, info, sections, binDataList) {
    this.header = header;
    this.info = info;
    this.sections = sections;
    this.binDataList = binDataList;
  }
  static fromBytes(buffer) {
    const container = read(buffer, {
      type: "array"
    });
    const header = HWPHeader.fromCfbContainer(container);
    const docInfo = DocInfo.fromCfbContainer(container, header);
    const sections = [];
    for (let i = 0; i < docInfo.properties.sections; i += 1) {
      const entry = find3(container, `Root Entry/${header.flags.distributed ? "ViewText" : "BodyText"}/Section${i}`);
      if (!entry) {
        throw new Error("Section not exist");
      }
      // Distribution documents use encrypted ViewText, never the fallback BodyText.
      const sectionEntry = header.flags.distributed ? { content: globalThis.HwpDistribution.decode(entry.content, header.flags.compressed) } : entry;
      sections.push(Section.fromEntry(sectionEntry, header));
    }
    const binDataList = [];
    for (const embedded of docInfo.idMappings.embeddings()) {
      const fileName = embedded.getCFBFileName();
      if (!fileName) {
        throw new Error("BinData not exist");
      }
      const entry = find3(container, `Root Entry/BinData/${fileName}`);
      if (!entry) {
        throw new Error("BinData not exist");
      }
      const payload = Uint8Array.from(entry.content);
      if (embedded.compressed(header)) {
        const data = inflate3(payload, { windowBits: -15 });
        binDataList.push(new BinData2(fileName, data));
      } else {
        binDataList.push(new BinData2(fileName, payload));
      }
    }
    return new _HWPDocument(header, docInfo, sections, binDataList);
  }
};

// src/parse.ts
function parse(buffer) {
  return HWPDocument.fromBytes(convertTypedArray(buffer));
}
function convertTypedArray(data) {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return data;
}
globalThis.HWPParser = {
  AlignStyle,
  Cell,
  CharCode,
  CharControl,
  CharControls,
  CommonCtrlID,
  Control,
  EffectColor,
  EffectColorEffect,
  EffectColorEffectKind,
  EffectColorKind,
  ExtendedControl,
  FieldCtrlID,
  GenShapeObjectControl,
  Glow,
  GutterKind,
  HWPDocument,
  InlineControl,
  Landscape,
  LineSegment,
  OtherCtrlID,
  Padding,
  PageBreak,
  PageDefinition,
  Paragraph,
  PictureAdditionalProperties,
  PictureControl,
  PictureEffect,
  PictureOutline,
  PictureRecord,
  PictureShadow,
  Point,
  Rect,
  Reflection,
  Section,
  ShadowStyle,
  SoftEdge,
  TableControl,
  TableRecord,
  ValidZone,
  makeCtrlID,
  parse,
  readChar
};
