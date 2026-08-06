/*
 * docx.js — 의존성 없는 .docx 내보내기
 *
 * 이 프로젝트는 빌드 도구/패키지 매니저 없이 도는 것이 전제라, 외부 zip 라이브러리를
 * 쓰지 않고 STORE(무압축) 방식 zip 작성기를 직접 넣었다. 무압축이어도 정규 zip 이므로
 * Word / 한글 / Google Docs 모두 정상적으로 연다. (파일 크기만 조금 커진다.)
 *
 * TPL.buildBlocks() 가 만든 블록 배열을 WordprocessingML 로 옮긴다.
 */

var DOCX = (function () {
  'use strict';

  /* ── zip (STORE) ──────────────────────────────────────────── */

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosTime(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xFFFF;
  }
  function dosDate(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  }

  // files: [{ name, data: Uint8Array }] → Blob
  function zipStore(files) {
    var enc = new TextEncoder();
    var now = new Date();
    var time = dosTime(now), date = dosDate(now);

    var locals = [], centrals = [], offset = 0;

    files.forEach(function (f) {
      var nameBytes = enc.encode(f.name);
      var crc = crc32(f.data);
      var size = f.data.length;

      var local = new Uint8Array(30 + nameBytes.length + size);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);      // version needed
      lv.setUint16(6, 0x0800, true);  // UTF-8 filename flag
      lv.setUint16(8, 0, true);       // method: store
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(f.data, 30 + nameBytes.length);
      locals.push(local);

      var central = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);      // version made by
      cv.setUint16(6, 20, true);      // version needed
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);      // extra len
      cv.setUint16(32, 0, true);      // comment len
      cv.setUint16(34, 0, true);      // disk start
      cv.setUint16(36, 0, true);      // internal attrs
      cv.setUint32(38, 0, true);      // external attrs
      cv.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centrals.push(central);

      offset += local.length;
    });

    var cdSize = centrals.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    return new Blob(locals.concat(centrals, [end]),
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /* ── XML 조립 ─────────────────────────────────────────────── */

  var FONT = '맑은 고딕';
  var SZ_BODY = 20;   // half-points → 10pt
  var SZ_H1 = 22;     // 11pt
  var SZ_TITLE = 32;  // 16pt
  var SZ_SMALL = 18;  // 9pt

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 줄바꿈을 <w:br/> 로 바꾼 run 들
  function runs(text, rPr) {
    var lines = String(text == null ? '' : text).split('\n');
    return lines.map(function (line, i) {
      return '<w:r>' + (rPr || '') +
        (i > 0 ? '<w:br/>' : '') +
        '<w:t xml:space="preserve">' + esc(line) + '</w:t></w:r>';
    }).join('');
  }

  function rPr(o) {
    o = o || {};
    var s = '<w:rPr><w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '"/>';
    if (o.b) s += '<w:b/><w:bCs/>';
    // CT_RPr 는 요소 순서가 정해져 있다: rFonts → b → color → sz. 순서를 지켜야 Word 가 군말 없이 연다.
    if (o.color) s += '<w:color w:val="' + o.color + '"/>';
    s += '<w:sz w:val="' + (o.sz || SZ_BODY) + '"/><w:szCs w:val="' + (o.sz || SZ_BODY) + '"/>';
    s += '</w:rPr>';
    return s;
  }

  function para(text, o) {
    o = o || {};
    var pPr = '<w:pPr>';
    pPr += '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 60 : o.after) +
           '" w:line="264" w:lineRule="auto"/>';
    if (o.indent) pPr += '<w:ind w:left="' + o.indent + '" w:hanging="' + (o.hanging || 0) + '"/>';
    if (o.align) pPr += '<w:jc w:val="' + o.align + '"/>';
    pPr += '</w:pPr>';
    return '<w:p>' + pPr + runs(text, rPr(o)) + '</w:p>';
  }

  function tableXml(block) {
    var cols = block.cols;
    var total = cols.reduce(function (a, b) { return a + b; }, 0);

    var borders = '<w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) {
        return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="666666"/>';
      }).join('') + '</w:tblBorders>';

    var xml = '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/>' +
      borders + '<w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="72" w:type="dxa"/>' +
      '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar>' +
      '</w:tblPr><w:tblGrid>' +
      cols.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') +
      '</w:tblGrid>';

    block.rows.forEach(function (row) {
      var trPr = '<w:trPr><w:cantSplit/>';
      if (row.some(function (c) { return c.grow; })) trPr += '<w:trHeight w:val="1400"/>';
      trPr += '</w:trPr>';

      var ci = 0;
      var cellsXml = row.map(function (c) {
        var span = c.span || 1;
        var w = 0;
        for (var k = 0; k < span; k++) w += cols[ci + k] || 0;
        ci += span;

        var tcPr = '<w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>';
        if (span > 1) tcPr += '<w:gridSpan w:val="' + span + '"/>';
        // 세로 병합: 시작 행은 restart, 이어지는 행은 값 없는 vMerge 로 표시한다.
        // (CT_TcPr 순서상 gridSpan 다음, shd 앞)
        if (c.rowspan) tcPr += '<w:vMerge w:val="restart"/>';
        else if (c.vmergeCont) tcPr += '<w:vMerge/>';
        if (c.head) tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
        tcPr += '<w:vAlign w:val="' + (c.head ? 'center' : 'top') + '"/></w:tcPr>';

        var opts = { b: !!c.head, align: c.align === 'center' ? 'center' : null, after: 0 };
        var body;
        if (c.lines && c.lines.length) {
          body = c.lines.map(function (l, i) {
            return para(l, { b: !!c.head, align: 'center', after: 0, sz: i === 0 ? SZ_BODY : SZ_SMALL });
          }).join('');
        } else {
          body = para(c.text, opts);
        }
        return '<w:tc>' + tcPr + body + '</w:tc>';
      }).join('');

      xml += '<w:tr>' + trPr + cellsXml + '</w:tr>';
    });

    return xml + '</w:tbl>' + para('', { after: 80 });
  }

  var LIST_PREFIX = {
    circle: function () { return '○ '; },
    num: function (i) { return (i + 1) + '. '; },
    paren: function (i) { return (i + 1) + ') '; },
    plain: function () { return ''; }
  };

  function blocksToXml(blocks) {
    return blocks.map(function (b) {
      switch (b.t) {
        case 'title':
          return para(b.text, { b: true, sz: SZ_TITLE, align: 'center', after: 40 });
        case 'sub':
          return para(b.text, { sz: SZ_BODY, align: 'center', after: 180 });
        case 'h1':
          return para(b.text, { b: true, sz: SZ_H1, before: 200, after: 80 });
        case 'h2':
          return para(b.text, { b: true, before: 100, after: 60 });
        case 'p':
          return para(b.text, {});
        case 'note':
          return para(b.text, { sz: SZ_SMALL, color: '595959' });
        case 'list':
          var pre = LIST_PREFIX[b.style] || LIST_PREFIX.plain;
          return b.items.map(function (item, i) {
            return para(pre(i) + item, { indent: 284, hanging: 284, after: 40 });
          }).join('');
        case 'table':
          return tableXml(b);
        default:
          return '';
      }
    }).join('');
  }

  var SECT_PR =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" ' +
    'w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="425"/></w:sectPr>';

  function documentXml(blocks) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>' + blocksToXml(blocks) + SECT_PR + '</w:body></w:document>';
  }

  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/>' +
    '<w:sz w:val="' + SZ_BODY + '"/><w:szCs w:val="' + SZ_BODY + '"/>' +
    '</w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/>' +
    '<w:jc w:val="left"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">' +
    '<w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '</w:styles>';

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>';

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';

  var DOC_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  function coreXml(title) {
    var iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + esc(title) + '</dc:title>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:modified>' +
      '</cp:coreProperties>';
  }

  var APP_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    '<Application>lessonplan</Application></Properties>';

  /* ── 공개 API ─────────────────────────────────────────────── */

  function build(blocks, title) {
    var enc = new TextEncoder();
    var files = [
      { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
      { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
      { name: 'docProps/core.xml', data: enc.encode(coreXml(title || '교육계획서')) },
      { name: 'docProps/app.xml', data: enc.encode(APP_XML) },
      { name: 'word/_rels/document.xml.rels', data: enc.encode(DOC_RELS) },
      { name: 'word/document.xml', data: enc.encode(documentXml(blocks)) },
      { name: 'word/styles.xml', data: enc.encode(STYLES_XML) }
    ];
    return zipStore(files);
  }

  return { build: build, zipStore: zipStore, crc32: crc32, documentXml: documentXml };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DOCX;
