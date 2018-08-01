
class PPU {

    constructor(nes) {

        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6

        // Rendering Options:
        this.showSpr0Hit = false;
        this.clipToTvSize = true;
        
        this.reset();
    }

    reset() {
        this.resetVramIO();
        this.resetVramSpriteMem();
        this.resetControlFlags();
        this.resetRenderingVars();
        this.resetCounters();
        this.resetSpriteData();
        this.resetTileTableBuffers();

        // misc resets
        this.curNt = null;
        this.scanline = 0;
        this.lastRenderedScanline = -1;
        this.curX = 0;
        this.palTable = this.PaletteTable();
        this.palTable.loadNTSCPalette();

        this.updateControlReg1(0);
        this.updateControlReg2(0);
    }

    resetRenderingVars() {
        this.attrib = this.scantile = new Array(32);
        this.buffer = this.prevBuffer = this.bgbuffer = this.pixrendered = new Array(256*240);
        this.validTileData = null;
        this.sprPalette = this.imgPalette = new Array(16);
    }

    resetVramSpriteMem() {
         // Zero out vram and spriteMem
         this.vramMem = new Array(0x8000) // 32768 Found references to this all over rom files and nes dev. no exact description though. 
         this.spriteMem = new Array(0x100)
         this.vramMem.forEach((element) => {
             element = 0;
         });
         this.spriteMem.forEach((element) => {
             element = 0;
         });
    }

    // f_ denotes a flag. usually a boolean value. 
    resetControlFlags() {
        // Control Flags Register 1
        this.f_nmiOnVblank = 0;
        this.f_spriteSize = 0; // 0=8x8, 1=8x16
        this.f_bgPatternTable = 0;
        this.f_spPatternTable = 0;
        this.f_addrInc = 0;
        this.f_nTblAddress = 0;

        // Register 2
        /*
        * @var {number} 
        */
        this.f_color = 0; // 0,2,4
        this.f_spVisibility = 0; // Sprite visibility 0,1
        this.f_bgVisibility = 0;
        this.f_spClipping = 0;
        this.f_bgClipping = 0;
        this.f_dispType = 0;
    }

    resetCounters() {
        this.regV = this.regFV = this.regFH = this.regH = this.regVT = this.regHT = this.regFH = this.regS = 0;
    }

    resetVramIO() {
         // VRAM I/O
         this.vramAddress = null;
         this.vramTmpAddress = null;
         this.vramBufferedReadValue = 0;
         this.firstWrite = true; // VRAM/Scroll Hi/Lo latch
 
         this.sramAddress = 0; // 8-bit only
         this.currentMirroring = -1;
         this.requestEndFrame = false;
         this.nmiOk = 0;
         this.scanlineAlreadyRendered = null;
    }

    resetSpriteData() {
        this.sprX = this.sprY = this.sprTile = this.sprCol = this.vertFlip = this.horiFlip = this.bgPriority = new Array(64);
        this.spr0HitX = this.spr0HitY = 0;
        this.hitSpr0 = false;
    }

    resetTileTableBuffers() {
        this.ptTile = new Array(512);
        this.ptTile.forEach((tile) => {
            tile = this.Tile(this.nes);
        });

        this.ntable1 = this.nameTable = new Array(4);
        this.currentMirroring = -1;
        this.nameTable.forEach((nt) => {
            nt = this.NameTable(32, 32, "Nt"+1);
        });
        this.vramMirrorTable = new Array(0x8000);
        this.vramMirrorTable.forEach((vmt, index) => {
            vmt = index; // I think I am resetting this incorrectly. Will have to wait and see.
        });
    }

    NameTable(x, y, index) {
        // Should probably just return a reference to the class
        return new NameTable(this.nes, x, y, index)
    }

    Tile(data) {
        // Should probably just return a reference to the class
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

class NameTable {

    constructor(nes, x, y, index) {
        this.nes = nes;
        this.x = x;
        this.y = y;
        this.index = index;
    }
}

class PaletteTable {

    constructor(nes) {
        this.nes = nes;
    }

    loadDefaultTable() {

    }

    loadNTSCPalette() {

    }
}

module.exports = PPU;
