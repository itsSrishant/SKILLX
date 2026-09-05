from PIL import Image

def remove_checkerboard(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    # The colors of the checkerboard from our previous test
    # (154, 154, 154) and similar shades.
    
    # We will do a simple BFS flood fill from the 4 corners.
    # A pixel is considered background if its RGB values are close to 154.
    
    # Actually, the user's uploaded image checkerboard might be exactly the same pattern everywhere.
    # Let's just iterate over all pixels.
    # Wait, the "SKILLX" text is also silver/gray! If we just replace all gray pixels, we ruin the text.
    # We MUST use flood fill.
    
    from collections import deque
    
    visited = set()
    q = deque()
    
    # Add borders to queue
    for x in range(width):
        q.append((x, 0))
        q.append((x, height - 1))
    for y in range(height):
        q.append((0, y))
        q.append((width - 1, y))
        
    for p in q:
        visited.add(p)
        
    def is_bg(c):
        # Checkerboard colors are roughly 100 to 180, and mostly gray (R~G~B)
        r, g, b, a = c
        if a < 255: return True # already transparent
        
        # Check if gray
        if abs(r-g) < 10 and abs(r-b) < 10 and abs(g-b) < 10:
            if 140 <= r <= 170:
                return True
        return False

    while q:
        x, y = q.popleft()
        c = pixels[x, y]
        
        if is_bg(c):
            pixels[x, y] = (0, 0, 0, 0)
            
            # Add neighbors
            for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        q.append((nx, ny))

    img.save(output_path)
    print("Done flood fill")

remove_checkerboard("frontend/public/images/logo-main.png", "frontend/public/images/logo-main-transparent.png")
