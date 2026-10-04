#!/usr/bin/swift
import AppKit
import Foundation

struct Rect: Decodable { let x: CGFloat; let y: CGFloat; let w: CGFloat; let h: CGFloat; let source_component: Int }
struct AtlasMap: Decodable { let parts: [String: Rect] }

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let atlasURL = root.appendingPathComponent("assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.png")
let mapURL = root.appendingPathComponent("assets/characters/scorpion/puppet/v1/body/scorpion_puppet_body_atlas_v1.json")
let outputURL = root.appendingPathComponent("docs/validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png")
let atlasMap = try JSONDecoder().decode(AtlasMap.self, from: Data(contentsOf: mapURL))
guard let source = NSImage(contentsOf: atlasURL), let sourceCG = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw NSError(domain: "contact-sheet", code: 1) }

let cellW: CGFloat = 252, cellH: CGFloat = 298, columns = 6
let ordered = atlasMap.parts.sorted { Int($0.key.split(separator: "_")[1])! < Int($1.key.split(separator: "_")[1])! }
let rows = Int(ceil(Double(ordered.count) / Double(columns)))
let output = NSImage(size: NSSize(width: cellW * CGFloat(columns), height: cellH * CGFloat(rows)))
output.lockFocus()
NSColor(calibratedRed: 0.09, green: 0.13, blue: 0.17, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: output.size)).fill()
let title = [NSAttributedString.Key.font: NSFont.monospacedSystemFont(ofSize: 12, weight: .bold), .foregroundColor: NSColor(calibratedRed: 0.97, green: 0.79, blue: 0.36, alpha: 1)]
let subtitle = [NSAttributedString.Key.font: NSFont.monospacedSystemFont(ofSize: 9, weight: .regular), .foregroundColor: NSColor(calibratedWhite: 0.78, alpha: 1)]
for (index, entry) in ordered.enumerated() {
    let column = index % columns, row = index / columns
    let x = CGFloat(column) * cellW, y = output.size.height - CGFloat(row + 1) * cellH
    let cell = NSRect(x: x + 2, y: y + 2, width: cellW - 4, height: cellH - 4)
    NSColor(calibratedRed: 0.04, green: 0.07, blue: 0.10, alpha: 1).setFill(); NSBezierPath(rect: cell).fill()
    NSColor(calibratedWhite: 0.38, alpha: 1).setStroke(); NSBezierPath(rect: cell).stroke()
    let rect = entry.value
    let sourceRect = CGRect(x: rect.x, y: rect.y, width: rect.w, height: rect.h)
    if let crop = sourceCG.cropping(to: sourceRect) {
        let fit = min((cellW - 24) / CGFloat(crop.width), (cellH - 58) / CGFloat(crop.height), 1)
        let width = CGFloat(crop.width) * fit, height = CGFloat(crop.height) * fit
        NSGraphicsContext.current?.cgContext.draw(crop, in: CGRect(x: x + (cellW - width) / 2, y: y + 12 + (cellH - 58 - height) / 2, width: width, height: height))
    }
    NSAttributedString(string: entry.key, attributes: title).draw(at: NSPoint(x: x + 12, y: y + cellH - 25))
    NSAttributedString(string: "\(Int(rect.w))x\(Int(rect.h))  source \(rect.source_component)", attributes: subtitle).draw(at: NSPoint(x: x + 12, y: y + cellH - 40))
}
output.unlockFocus()
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
guard let data = output.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) else { throw NSError(domain: "contact-sheet", code: 2) }
try png.write(to: outputURL)
print(outputURL.path)
