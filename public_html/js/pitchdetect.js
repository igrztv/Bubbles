
function Microphone(){

	this.AudioContext = window.AudioContext || window.webkitAudioContext;

	this.audioContext = null;
	this.isPlaying = false;
	this.sourceNode = null;
	this.analyser = null;
	this.theBuffer = null;
	this.DEBUGCANVAS = null;
	this.mediaStreamSource = null;
	this.detectorElem, 
		this.canvasElem,
		this.waveCanvas,
		this.pitchElem,
		this.noteElem,
		this.detuneElem,
		this.detuneAmount;
	this.rafID = null;
	this.tracks = null;
	this.buflen = 1024;
	this.buf = new Float32Array( this.buflen );

	this.noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	this.MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

}

Microphone.prototype.activateMicrophone = function(res){
	//var data = this.data;
	//console.log(this);
	this.audioContext = new this.AudioContext();

	this.detectorElem = document.getElementById( "detector" );
	this.canvasElem = document.getElementById( "output" );
	this.DEBUGCANVAS = document.getElementById( "waveform" );
	if (this.DEBUGCANVAS) {
		this.waveCanvas = this.DEBUGCANVAS.getContext("2d");
		this.DEBUGCANVAS.width = window.innerWidth - 5;
        this.DEBUGCANVAS.height = window.innerHeight - 5;
		this.waveCanvas.strokeStyle = "black";
		this.waveCanvas.lineWidth = 1;
	}
	this.pitchElem = document.getElementById( "pitch" );
	this.noteElem = document.getElementById( "note" );
	this.detuneElem = document.getElementById( "detune" );
	this.detuneAmount = document.getElementById( "detune_amt" );

	this.getUserMic(
    	{
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
		}, res.bind(this));
}

Microphone.prototype.gotStream = function(stream){
    // Create an AudioNode from the stream.
    console.log(this);
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    console.log(this.analyser);
    //debugger;
    this.mediaStreamSource.connect( this.analyser );
    console.log('this.updatePitch();');
    //this.updatePitch();
}

Microphone.prototype.getUserMic = function(dictionary, callback) {
    navigator.getUserMedia = 
    	navigator.getUserMedia ||
    	navigator.webkitGetUserMedia ||
    	navigator.mozGetUserMedia;
    navigator.getUserMedia(dictionary, callback, 
    	function(){
			console.log('Stream generation failed.');
		});
}

Microphone.prototype.autoCorrelate = function( buf, sampleRate ) {
	//this is absolutly 'math' function = global variable independent
	var SIZE = this.buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0; //сумма квадратов амплитуд
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i = 0; i < SIZE; i++) {
		var val = this.buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);

	if (rms<0.01){
		// not enough signal
		return -1;
	}
	if(rms > 0.25){
		//console.log('looking like noise');
		return -2;
	}
		

	var lastCorrelation=1;
	for (var offset = this.MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((this.buf[i])-(this.buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>0.9) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		//console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
//	var best_frequency = sampleRate/best_offset;
}

Microphone.prototype.updatePitch = function(){
	//console.log('function updatePitch( time )');
	//return;
	var cycles = new Array;
	//console.log(this.analyser);
	//debugger;
	this.analyser.getFloatTimeDomainData( this.buf );
	var ac = this.autoCorrelate( this.buf, this.audioContext.sampleRate );
	// TODO: Paint confidence meter on canvasElem here.

	if (this.DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
		var amp = window.innerHeight / 8;
		this.waveCanvas.clearRect(0, 0, this.DEBUGCANVAS.width, this.DEBUGCANVAS.height);
		this.waveCanvas.strokeStyle = "black";
		this.waveCanvas.beginPath();
		this.waveCanvas.moveTo(0, this.DEBUGCANVAS.height / 2);
		var freeZone = (this.DEBUGCANVAS.width - this.buf.length)/2;
		this.waveCanvas.lineTo(freeZone, this.buf[0] + this.DEBUGCANVAS.height/2);
		for (var i = 1; i < this.buf.length; i++) {
			this.waveCanvas.lineTo(freeZone + i, this.DEBUGCANVAS.height/2 + (this.buf[i]*amp));
		}
		this.waveCanvas.lineTo(freeZone + this.buf.length, this.DEBUGCANVAS.height/2);
		this.waveCanvas.lineTo(2*freeZone + this.buf.length, this.DEBUGCANVAS.height/2);
		this.waveCanvas.stroke();
	}

	if(ac == -2){

	}else{
	 	if (ac == -1) {
	 		this.detectorElem.className = "vague";
		 	this.pitchElem.innerText = "--";
			this.noteElem.innerText = "-";
			this.detuneElem.className = "";
			this.detuneAmount.innerText = "--";
	 	} else {
		 	this.detectorElem.className = "confident";
		 	var pitch = ac;
		 	this.pitchElem.innerText = Math.round( pitch ) ;
			var noteNum = 12 * (Math.log( pitch / 440 )/Math.log(2) );
			var note = Math.round( noteNum ) + 69;
			this.noteElem.innerHTML = this.noteStrings[note%12];	
			var note = 440 * Math.pow(2,(note-69)/12);
			var detune = Math.floor( 1200 * Math.log( pitch / note)/Math.log(2) );
			
			if (detune == 0 ) {
				this.detuneElem.className = "";
				this.detuneAmount.innerHTML = "--";
			} else {
				if (detune < 0)
					this.detuneElem.className = "flat";
				else
					this.detuneElem.className = "sharp";
				this.detuneAmount.innerHTML = Math.abs( detune );
			}
		}
	}

	if (!window.requestAnimationFrame){
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
		//console.log('requestAnimationFrame');
	}else{
		//console.log('!requestAnimationFrame');
	}
		
	//rafID = window.requestAnimationFrame( updatePitch );

	return (ac == -2) ? true : false;
}

/*Microphone.prototype.requireMicrophone = function(){
    navigator.getUserMedia = 
    	navigator.getUserMedia ||
    	navigator.webkitGetUserMedia ||
    	navigator.mozGetUserMedia;
    navigator.getUserMedia(
		{
			"audio": {
				"mandatory": {
					"googEchoCancellation": "false",
					"googAutoGainControl": "false",
					"googNoiseSuppression": "false",
					"googHighpassFilter": "false"
				},
				"optional": []
			},
		}, 
		function(stream){
			this.getStream(stream);
		},
		function(){
			console.log('Stream generation failed.');
		}
	);
}*/

/*
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, 
	canvasElem,
	waveCanvas,
	pitchElem,
	noteElem,
	detuneElem,
	detuneAmount;

function activateMicrophone() {
	audioContext = new AudioContext();

	detectorElem = document.getElementById( "detector" );
	canvasElem = document.getElementById( "output" );
	DEBUGCANVAS = document.getElementById( "waveform" );
	if (DEBUGCANVAS) {
		waveCanvas = DEBUGCANVAS.getContext("2d");
		DEBUGCANVAS.width = window.innerWidth - 5;
        DEBUGCANVAS.height = window.innerHeight - 5;
		waveCanvas.strokeStyle = "black";
		waveCanvas.lineWidth = 4;
	}
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	detuneElem = document.getElementById( "detune" );
	detuneAmount = document.getElementById( "detune_amt" );
	requireMicrophone();
}

function requireMicrophone() {
    
	try {
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;
        navigator.getUserMedia(
			{
				"audio": {
					"mandatory": {
						"googEchoCancellation": "false",
						"googAutoGainControl": "false",
						"googNoiseSuppression": "false",
						"googHighpassFilter": "false"
					},
					"optional": []
				},
			}, 
			function(stream){
				//console.log(stream);
				mediaStreamSource = audioContext.createMediaStreamSource(stream);

				// Connect it to the destination.
				analyser = audioContext.createAnalyser();
				analyser.fftSize = 2048;
				mediaStreamSource.connect( analyser );
				console.log('updatePitch()');
				//updatePitch();
			},
			function(){
				alert('Stream generation failed.');
			}
		);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array( buflen );

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

function autoCorrelate( buf, sampleRate ) {
	//this is absolutly 'math' function = global variable independent
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0; //сумма квадратов амплитуд
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);

	if (rms<0.01){
		// not enough signal
		return -1;
	}
	if(rms > 0.25){
		//console.log('looking like noise');
		return -2;
	}
		

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>0.9) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		//console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
//	var best_frequency = sampleRate/best_offset;
}

function updatePitch( time ) {
	console.log('function updatePitch( time )');
	var cycles = new Array;
	analyser.getFloatTimeDomainData( buf );
	var ac = autoCorrelate( buf, audioContext.sampleRate );
	// TODO: Paint confidence meter on canvasElem here.

	if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
		waveCanvas.clearRect(0,0,DEBUGCANVAS.width,DEBUGCANVAS.height);
		waveCanvas.strokeStyle = "black";
		waveCanvas.beginPath();
		waveCanvas.moveTo(0, DEBUGCANVAS.height/2);
		var freeZone = (DEBUGCANVAS.width - buf.length)/2;
		waveCanvas.lineTo(freeZone, buf[0] + DEBUGCANVAS.height/2);
		for (var i = 1; i < buf.length; i++) {
			waveCanvas.lineTo(freeZone + i, DEBUGCANVAS.height/2 + (buf[i]*128));
		}
		waveCanvas.lineTo(freeZone + buf.length, DEBUGCANVAS.height/2);
		waveCanvas.lineTo(2*freeZone + buf.length, DEBUGCANVAS.height/2);
		waveCanvas.stroke();
	}

	if(ac == -2){

	}else{
	 	if (ac == -1) {
	 		detectorElem.className = "vague";
		 	pitchElem.innerText = "--";
			noteElem.innerText = "-";
			detuneElem.className = "";
			detuneAmount.innerText = "--";
	 	} else {
		 	detectorElem.className = "confident";
		 	pitch = ac;
		 	pitchElem.innerText = Math.round( pitch ) ;
			var noteNum = 12 * (Math.log( pitch / 440 )/Math.log(2) );
			var note = Math.round( noteNum ) + 69;
			noteElem.innerHTML = noteStrings[note%12];	
			var note = 440 * Math.pow(2,(note-69)/12);
			var detune = Math.floor( 1200 * Math.log( pitch / note)/Math.log(2) );
			
			if (detune == 0 ) {
				detuneElem.className = "";
				detuneAmount.innerHTML = "--";
			} else {
				if (detune < 0)
					detuneElem.className = "flat";
				else
					detuneElem.className = "sharp";
				detuneAmount.innerHTML = Math.abs( detune );
			}
		}
	}

	if (!window.requestAnimationFrame){
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
		console.log('requestAnimationFrame');
	}else{
		//console.log('!requestAnimationFrame');
	}
		
	//rafID = window.requestAnimationFrame( updatePitch );

	return (ac == -2) ? true : false;
}
*/