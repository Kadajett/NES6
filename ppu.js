/**
 * PPU Picture Processing Unit
 * https://wiki.nesdev.com/w/index.php/PPU
 */
class PPU {

    constructor(nes) {

        this.nes = nes;

        this.STATUS_VRAMWRITE = 4;
        this.STATUS_SLSSPRITECOUNT = 5;
        this.STATUS_SPRITE0HIT = 6;
        this.STATUS_VBLANK = 7;

        // Rendering Options:
        this.showSpr0Hit = false;
        this.clipToTvSize = true;

        /**
         * used for drawing a background color on monochrome displays
         */
        this.internalColorPalette = {
            red: 0x0000FF,
            black: 0x0,
            green: 0x00FF00,
            blue: 0xFF0000
        };
        
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
        this.bufferSize = {
            x: 256,
            y: 240
        }
        this.buffer = this.prevBuffer = this.bgbuffer = this.pixrendered = new Array(this.bufferSize.x * this.bufferSize.y);
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
        /**
         * Control Flags Register 1
         */
        this.f_nmiOnVblank = 0;
        /**
         * possible values of
         * 0=8x8, 1=8x16
         */
        this.f_spriteSize = 0; 
        this.f_bgPatternTable = 0;
        this.f_spPatternTable = 0;
        this.f_addrInc = 0;
        this.f_nTblAddress = 0;

        // Register 2
        /** 
        * Flags
        */
        this.f_color = this.f_spVisibility = this.f_bgVisibility = this.f_spClipping = this.f_bgClipping = this.f_dispType = 0;
    }

    resetCounters() {
        /**
         * Registers
         */
        this.regV = this.regFV = this.regFH = this.regH = this.regVT = this.regHT = this.regFH = this.regS = 0;

        /**
         * Counters
         */
        this.cntFV = this.cntV = this.cntH = this.cntVT = this.cntHT = null;


        this.nmiCounter = 0;
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

    setMirroring(mirroring) {
        if(mirroring === this.currentMirroring) {
            return;
        }

        this.currentMirroring = mirroring;
        this.triggerRendering();

        if(this.vramMirrorTable === null) {
            this.vramMirrorTable = new Array(0x8000);
        }
        this.vramMirrorTable.forEach((vmt, index) => {
            vmt = i;
        });

        // https://opcode-defined.quora.com/How-NES-Graphics-Work-Sprites-and-Palettes Is the best resource for learning about this. Drink some whiskey before you get into it. 
        this.defineMirrorRegion(0x3F20, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3F40, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3F80, 0x3F00, 0x20);
        this.defineMirrorRegion(0x3Fc0, 0x3F00, 0x20);

        this.defineMirrorRegion(0x3000, 0x2000, 0xF00);
        this.defineMirrorRegion(0x4000, 0x0000, 0x4000);

        if(mirroring === this.nes.rom.HORIZONTAL_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2400, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2800, 0x400);
        } else if(mirroring === this.nes.rom.VERTICAL_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 0;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2800, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2800, 0x400);
        } else if(mirroring === this.nes.rom.SINGLESCREEN_MIRRORING) {
            this.ntable1[0] = 0;
            this.ntable1[1] = 0;
            this.ntable1[2] = 0;
            this.ntable1[3] = 0;
            
            this.defineMirrorRegion(0x2400, 0x2000, 0x400);
            this.defineMirrorRegion(0x2800, 0x2000, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2000, 0x400);
        } else if(mirroring === this.nes.rom.SINGLESCREEN_MIRRORING2) {
            this.ntable1[0] = 1;
            this.ntable1[1] = 1;
            this.ntable1[2] = 1;
            this.ntable1[3] = 1;
            
            this.defineMirrorRegion(0x2400, 0x2400, 0x400);
            this.defineMirrorRegion(0x2800, 0x2400, 0x400);
            this.defineMirrorRegion(0x2C00, 0x2400, 0x400);
        } else {
            // assume 4 screen mirroring

            this.ntable1[0] = 0;
            this.ntable1[1] = 1;
            this.ntable1[2] = 2;
            this.ntable1[3] = 3;

            // No mirroring region?
        }
    }

    triggerRendering() {

    }

    defineMirrorRegion(fromStart, toStart, size) {
        // think of this like a piston array. It mirrors at specific places through the engine non sequentially. 
        for(let i = 0; i < size; i++) {
            this.vramMirrorTable[fromStart+i] = toStart+i;
        }
    }

    startVBlank() {
        // Do NMI Non Maskable Interrupt
        this.nes.cpu.requestIrq(this.nes.cpu.IRQ_NMI);

        // make sure everything is rendered
        // 239 because the PPU generates a video signal with 240 lines of pixels
        if(this.lastRenderedScanline < 239) {
            this.renderFramePartially(
                this.lastRenderedScanline + 1,
                240 - this.lastRenderedScanline
            )
        }

        this.endFrame();
        this.resetLastRenderedScanline();
    }

    endScanline() {
        switch(this.scanline) {
            case 19: 
                // Dummy scanline
                if(this.dummyCycleToggle){
                    // removes the dummy pixel at the end of each scanline
                    this.curX = 1;
                }
                break;
            
            case 20: 
                // Clear VBlank flag? 
                this.setStatusFlag(this.STATUS_VBLANK, false);

                // clear Sprite #0 hit flag
                this.setStatusFlag(this.STATUS_SPRITE0HIT, false);
                this.hitSpr0 = false;
                this.spr0HitX = this.spr0HitY = -1;

                if(this.f_bgVisibility == 1 || this.f_spVisibility == 1) {
                    // setting the counters to what is held in the faux-registers? 
                    this.cntFV = this.regFV;
                    this.cntV = this.regV;
                    this.cntH = this.regH;
                    this.cntVT = this.regVT;
                    this.cntHT = this.regHT;

                    if(this.f_bgVisibility == 1) {
                        // Render dummy scanline
                        this.renderBGScanline(false, 0);
                    }
                }
                // Sadly, the flags arent booleans and arent always 0 || 1. In this case they are, so I can booleanify them. 
                if(!!this.f_bgVisibility && !!this.f_spVisibility) {
                    // Check sprite0 hit for first scanline
                    this.checkSprite0(0)
                }

                if(!!this.f_bgVisibility || !!this.f_spVisibility) {
                    this.nes.mmap.clockIrqCounter();
                }
                break;
            
            case 261: 
                // Dead scanline do not render
                this.setStatusFlag(this.STATUS_VBLANK, true);
                this.requestEndFrame = true;
                this.nmiCounter = 9;

                // Wrap around
                this.scanline = -1; // will be incremented to 0 later
                break;
            default: 
                if(this.scanline > 21 && this.scanline <= 260) {
                    // Render normally
                    if(this.f_bgVisibility == 1) {
                        if(!this.scanlineAlreadyRendered) {
                            this.cntHT = this.regHT;
                            this.cntH = this.regH;
                            this.renderBGScanline(true, this.scanline - 20);
                        }
                        this.scanlineAlreadyRendered = false;

                        // Check for sprite 0
                        if(!this.hitSpr0 && this.f_spVisibility == 1) {
                            if(Array.isArray(this.sprX) &&
                            Array.isArray(this.sprY) &&
                            this.sprx[0] >= -7 &&
                            this.sprY[0] + 1 <= (this.scanline - 20) &&
                            (this.sprY[0] + 1 + (this.f_spriteSize === 0 ? 8:16)) >= (this.scanline - 20)) {
                                if(this.checkSprite0(this.scanline - 20)) {
                                    this.hitSpr0 = true;
                                }
                            }
                        }
                    }
                }

                if(this.f_bgVisibility == 1 || this.f_spVisibility == 1) {
                    // clock mapper irq counter. Whatever that means...
                    this.nes.mmap.clockIrqCounter();
                }
        }

        this.scanline ++;
        this.regsToAddress();
        this.cntsToAddress();
    }

    /**
     * Prepare frame for display. Includes decideing the background color and creating the pixel buffer
     */
    startFrame() {
        let bgColor = 0;
        let buffer = this.buffer;
        let i;
        let pixrendered = this.pixrendered;


        // set background color
        if(this.f_dispType === 0) {
            // color display
            // Use first entry in palette as BG Color
            bgColor = this.imgPalette[0];
        } else {
            switch (this.f_color) {
                case 0:
                    bgColor = this.internalColorPalette.black;
                    break;
                case 1:
                    bgColor = this.internalColorPalette.green;
                    break;
                case 2:
                    bgColor = this.internalColorPalette.blue;
                    break;
                case 3:
                    // Invalid, use black
                    bgColor = this.internalColorPalette.black;
                    break;
                case 4:
                    bgColor = this.internalColorPalette.red;
                    break; 
                default: 
                    // invalid, use black
                    bgColor = this.internalColorPalette.black;
            }
        }

        buffer.forEach(element => {
            element = bgColor;
        });
        pixrendered.forEach(element => {
            element = 65;
        });
    }

    endFrame() {
        // @TODO: Finish this
        let i, x, y, buffer = this.buffer;
        let red = 0x55FF55; // this is different from the original red for some reason? 
        // Very drunk while writing this. Sorry for the crappy code!
        if(this.showSpr0Hit) {
            if(this.sprX[0] >= 0 && this.sprX[0] < this.bufferSize.x && this.sprY[0] >= 0 && this.sprY[0] < this.bufferSize.y) {
                for(i = 0; i < this.bufferSize.x; i++){
                    buffer[(this.sprY[0] << 8) + i] = red;
                    if(i < this.bufferSize.y) {
                        buffer[(i << 8) + this.sprX[0]] = red; // what would happen if I change this value? Play around with it... 
                    }
                }
                
            }
            if(this.spr0HitX >= 0 && this.spr0HitX < this.bufferSize.x && this.spr0HitY >= 0 && this.spr0HitY < this.bufferSize.y) {
                for(i = 0; i < this.bufferSize.x; i++){
                    buffer[(this.spr0HitY << 8) + i] = red;
                    if(i < this.bufferSize.y) {
                        buffer[(i << 8) + this.spr0HitX] = red; // what would happen if I change this value? Play around with it... 
                    }
                }
                
            }
        }

        // if either the sprite or the bg is clipped, clip both. Fix later? 
        if(this.clipToTvSize || this.f_bgClipping === 0 || this.f_spClipping === 0) {
            /**
             * This is where we do the clipping for the screen edges
             */
            // clip left 8 pixels
            for(y = 0; y < this.bufferSize.y; y++) {
                for(x = 0; x < 8; x++) {
                    buffer[(y << 8) + x] = 0;
                }
            }
        }

        if(this.clipToTvSize) {
            for(y = 0; y < 8 y++) {
                for(x = 0; x < this.bufferSize.x; x++) {
                    buffer[(y << 8) + x] = 0;
                    buffer[((239 - y) << 8) + x] = 0;
                }
            }
        }

        if(this.nes.opts.showDisplay) {
            // this.nes.ui.writeFrame(buffer, this.prevBuffer);
        }
    }

    regsToAddress() {

    }

    cntsToAddress() {

    }

    checkSprite0(line) {
        // @TODO: do this
    }

    renderBGScanline() {
        // @TODO: Do this
    }

    setStatusFlag(title, flag) {
        if(typeof title === 'boolean' && typeof flag === 'boolean') {
            title = flag;
        }
    }

    resetLastRenderedScanline() {
        // just doing this in a function so I can easily track when it happens during debugging. 
        this.lastRenderedScanline = -1;
    }

    renderFramePartially(startLine, stopLine) {
        // @TODO: finish this
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
