(() => {
    const NES = require('./nes');
    window.nes = new NES();

    if(window.File && window.FileReader && window.FileList && window.Blob) {
        document.getElementById("filePicker").addEventListener('change', (evt) => {
            let files = evt.target.files;
            let reader = new window.FileReader();
            reader.readAsBinaryString(files[0])
            reader.onload = (fileInfo) => {
                window.nes.loadRom(fileInfo.srcElement.result);
            }
            
            
        });
    }

    console.log(window.nes)
})();