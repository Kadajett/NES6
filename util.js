class Util {
    /**
     * used to prep arrays for memory use. Fills them with null so they can be looped over later
     * @param {array} array the array to fill with null values
     */
    fillArray(array) {
        if(array && array.length) {
            let length = array.length;
            for(let i = 0; i < length; i ++) {
                array[i] = null;
            }
        } else {
            // using var here so it can get out of the if block
            var array = [null];
        }
        return array;
    }
}

module.exports = new Util();