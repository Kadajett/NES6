
class PPU {
    constructor(nes) {
        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6

        this.vramMem = null;
        this.spriteMem = null;
        this.vramAddress = null;
        this.vramTmpAddress = null;
        this.vramBufferedReadValue = null;
        this.firstWrite = null;
        this.sramAddress = null;
        this.currentMirroring = null;
        this.requestEndFrame = null;
        this.nmiOk = null;
        this.dummyCycleToggle = null;
        this.validTileData = null;
        this.nmiCounter = null;
        this.scanlineAlreadyRendered = null;
        this.f_nmiOnVblank = null;   
        this.f_spriteSize = null;
        this.f_bgPatternTable = null;
        this.f_spPatternTable = null;
        this.f_addrInc = null;
        this.f_nTblAddress = null;
        this.f_color = null;
        this.f_spVisibility = null;
        this.f_bgVisibility = null;
        this.f_spClipping = null;
        this.f_bgClipping = null;
        this.f_dispType = null;
        this.cntFV = null;
        this.cntV = null;
        this.cntH = null;
        this.cntVT = null;
        this.cntHT = null;
        this.regFV = null;
        this.regV = null;
        this.regH = null;
        this.regVT = null;
        this.regHT = null;
        this.regFH = null;
        this.regS = null;
        this.curNt = null;
        this.attrib = null;
        this.buffer = null;
        this.prevBuffer = null;
        this.bgbuffer = null;
        this.pixrendered = null;
        
        this.validTileData = null;
        this.scantile = null;
        this.scanline = null;
        this.lastRenderedScanline = null;
        this.curX = null;
        this.sprX = null; 
        this.sprY = null; 
        this.sprTile = null; 
        this.sprCol = null; 
        this.vertFlip = null; 
        this.horiFlip = null; 
        this.bgPriority = null; 
        this.spr0HitX = null; 
        this.spr0HitY = null; 
        this.hitSpr0 = null;
        this.sprPalette = null;
        this.imgPalette = null;
        this.ptTile = null;
        this.ntable1 = null;
        this.currentMirroring = null;
        this.nameTable = null;
        this.vramMirrorTable = null;
        this.palTable = null;
        
        
        // Rendering Options:
        this.showSpr0Hit = false;
        this.clipToTvSize = true;
        
        this.reset();
    }

    reset() {

    }

    Tile(data) {
        return new Tile(this.nes, data);
    }
}

// This is an antipattern, but the seperation of concerns in the nes is friggin weird.
class Tile {
    constructor(nes, data) {
        this.nes = nes;
        this.data = data;
    }

    setScanline(x,y,z) {

    }
}

module.exports = PPU;
