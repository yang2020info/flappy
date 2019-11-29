// Load main library
var Game = window.Game || {};

Game.drawImage = (function() {
    // Image cache
    var images = {};
    // List of all images in the game
    var imageList = [
            'pipe_bottom.png',
            'pipe_top.png',
            'player.png',
            'background.png',
            'ground.png',
            'title.png'
        ];
    
    // Pre-load all images
    Game.loadImages = function(callback) {
        var numLoadedImages = 0, i, img;
        
        for(i = 0;  i < imageList.length;  ++i) {
            img = new Image();
            images[imageList[i]] = img;
            // Call the callback after all images are loaded
            img.onload = function() {
                ++numLoadedImages;
                if(numLoadedImages == imageList.length)
                    callback();
            };
            img.src = imageList[i];
        }
    }

    // Draw an image
    return function (ctx, filename) {
        var imageArgs = Array.prototype.slice.call(arguments,2),
            cachedImage = images[filename];
            
        // Obvious, but not crash-y, indication that image is not in cache
        if (cachedImage === undefined) { cachedImage = images['hello.png']; }
        
        imageArgs.unshift(cachedImage);
        ctx.drawImage.apply(ctx,imageArgs);
    };
}());
