import xml.etree.ElementTree as ET

dec = """<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">"""
blocks = ['f1', 'f2', 'f3', 'f4', 'f5', 'line', 'forward', 'backward', 'left', 'right', 'up', 'down', 'placeblock', 'repeat']

tree = ET.parse("media/blocklySvg.svg")
root = tree.getroot()
defs = root.getchildren()[0]

blockSvgs = root.getchildren()[1].find("{http://www.w3.org/2000/svg}g").getchildren()[0].getchildren()

ET.register_namespace("", "http://www.w3.org/2000/svg")

for i, b in enumerate(blocks):
    newSvg = ET.Element("svg", {"class":"blocklySvg", "version":"1.1"})
    newSvg.append(defs)
    g = ET.SubElement(newSvg, "g")
    g.append(blockSvgs[i*2])
    newSvg.set("width", "{}px".format(g.find("{http://www.w3.org/2000/svg}rect").get("width")))
    newSvg.set("height", "{}px".format(g.find("{http://www.w3.org/2000/svg}rect").get("height")))
    g.append(blockSvgs[i*2+1])
    g.find("{http://www.w3.org/2000/svg}g").set("transform", "")
    filename = "media/{}.svg".format(b)
    ET.ElementTree(newSvg).write(open(filename, 'w'));
    f = open(filename, "r+")
    text = f.read()
    text = dec + text
    text = text.replace('.blocklySvg { border: 1px solid rgb(221, 221, 221); overflow: hidden; background-color: rgb(255, 255, 255); }',
                        '.blocklySvg { overflow: hidden; background-color: rgb(255, 255, 255, 0.0); }')
    text = text.replace('.blocklyText { cursor: default; font-family: sans-serif; font-size: 11pt; fill: rgb(255, 255, 255); }',
                        '.blocklyText { cursor: default; font-family: sans-serif; font-size: 11pt; fill: rgb(255, 255, 255); }\n.blocklyNonEditableText>rect,.blocklyEditableText>rect { fill: #fff; fill-opacity: .6; }\n.blocklyNonEditableText>text,.blocklyEditableText>text { fill: #000 }')
    text = text.replace('<style type="text/css">', '<style type="text/css"><![CDATA[')
    text = text.replace('</style>', ']]></style>')
    text = text.replace('.blocklyDraggable { cursor: url(file:///Users/awb/Documents/Research/ruthefjord/html/media/handopen.cur) 8 5, auto; }', '')
    f.seek(0)
    f.write(text)
    f.close()
