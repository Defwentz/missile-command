/* webgl globals */
var gl = null;
var shaderProgram;
// everything got 2 sets, first one contains triangles, second one contains ellipsoids
var objs = [[],[]];

var dummy = null;

/* constants */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_HEAD_URL = "https://ncsucgclass.github.io/prog3/" // header url
const INPUT_TRIANGLES_URL = "triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "ellipsoids.json"; // ellipsoids file loc
const INPUT_LIGHTS_URL = "lights.json"; // lights file loc

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
	url = INPUT_HEAD_URL + url;
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

function isCapsLockOn(e) {
	return event.getModifierState && event.getModifierState( 'CapsLock' );
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}