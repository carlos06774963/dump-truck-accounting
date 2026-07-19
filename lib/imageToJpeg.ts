export function convertToJpeg(file: File): Promise<Blob> {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader()
    reader.onload = function(e) {
      var img = new Image()
      img.onload = function() {
        var canvas = document.createElement('canvas')
        var w = img.width
        var h = img.height
        var max = 1200
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max }
          else { w = Math.round(w * max / h); h = max }
        }
        canvas.width = w
        canvas.height = h
        var ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas')); return }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob)
          else reject(new Error('Conversion failed'))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = function() { reject(new Error('Image load failed')) }
      img.src = (e.target as FileReader).result as string
    }
    reader.onerror = function() { reject(new Error('File read failed')) }
    reader.readAsDataURL(file)
  })
}
