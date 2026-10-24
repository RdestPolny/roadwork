// Subject mask of an image with Apple Vision (macOS 14+): every foreground instance, soft alpha, the input's size.
// Build: swiftc -O vmask.swift -o vmask (check.py cut builds it on demand). Run: vmask in.png out.png
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3, let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fputs("usage: vmask in.png out.png\n", stderr); exit(1) }
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: image)
try handler.perform([request])
guard let result = request.results?.first else { fputs("no subject\n", stderr); exit(2) }
let mask = CIImage(cvPixelBuffer: try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler))
guard let out = CIContext().createCGImage(mask, from: mask.extent),
      let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(3) }
CGImageDestinationAddImage(dst, out, nil)
CGImageDestinationFinalize(dst)
