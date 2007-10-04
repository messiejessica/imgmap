/**
 *	Online Image Map Editor - main script file.
 *	This is the main script file of the Online Image Map Editor. 
 *	@date	26-02-2007 2:24:50
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@copyright
 *	@version 2.0beta2
 *	 
 *	TODO:
 *	-pic_container dynamic create(pos rel)?
 *	-scriptload race condition fix
 *	-destroy/cleanup function ?
 *	-testing highlighter
 *	-testing in more browsers  
 *	-cursor area_mousemove in opera not refreshing quite well
 *	-test in safari 
 *	-get rid of memo array
 *	-merge props and areas arrays
 *	-highlight which control point is edited in html or form mode, up/down keys to change them   
 *	-more comments, especially on config vars
 *	-make function names more logical
 *	-prepare for bad input /poly not properly closed?
 *	-prepare for % values in coords  
 *	-prepare for default shape http://www.w3.org/TR/html4/struct/objects.html#edef-AREA
 */


function imgmap(config) {
	this.version = "2.0beta2";
	this.releaseDate = "2007-02-11";
	this.config = new Object();
	this.is_drawing = 0;
	this.strings   = new Array();
	this.memory    = new Array();
	this.areas     = new Array();
	this.props     = new Array();
	this.logStore  = new Array();
	this.currentid = 0;
	this.viewmode  = 0;
	this.loadedScripts = new Array();
	this.isLoaded   = false;
	this.cntReloads = 0;
	this.mapname    = '';
	this.mapid      = '';

	//is_drawing draw mode constants 
	this.DM_RECTANGLE_DRAW          = 1;
	this.DM_RECTANGLE_MOVE          = 11;
	this.DM_RECTANGLE_RESIZE_TOP    = 12;
	this.DM_RECTANGLE_RESIZE_RIGHT  = 13;
	this.DM_RECTANGLE_RESIZE_BOTTOM = 14;
	this.DM_RECTANGLE_RESIZE_LEFT   = 15;
	
	this.DM_SQUARE_DRAW             = 2;
	this.DM_SQUARE_MOVE             = 21;
	this.DM_SQUARE_RESIZE_TOP       = 22;
	this.DM_SQUARE_RESIZE_RIGHT     = 23;
	this.DM_SQUARE_RESIZE_BOTTOM    = 24;
	this.DM_SQUARE_RESIZE_LEFT      = 25;
	
	this.DM_POLYGON_DRAW            = 3;
	this.DM_POLYGON_LASTDRAW        = 30;
	this.DM_POLYGON_MOVE            = 31;

	//set some config defaults
	this.config.mode     = "editor";
	this.config.imgroot  = "";
	this.config.baseroot = "";
	this.config.lang     = "en";
	this.config.loglevel = 0;
	this.config.buttons          = ['add','delete','preview','html'];
	this.config.button_callbacks = new Array();

	this.config.CL_DRAW_BOX        = '#dd2400';
	this.config.CL_DRAW_SHAPE      = '#d00';
	this.config.CL_DRAW_BG         = '#fff';
	this.config.CL_NORM_BOX        = '#dd2400';
	this.config.CL_NORM_SHAPE      = '#d00';
	this.config.CL_NORM_BG         = '#fff';
	this.config.CL_HIGHLIGHT_BOX   = '#dd2400';
	this.config.CL_HIGHLIGHT_SHAPE = '#d00';
	this.config.CL_HIGHLIGHT_BG    = '#fff';
	this.config.CL_KNOB            = '#ffeeee';
	this.config.CL_HIGHLIGHT_PROPS = '#e7e7e7';

	this.config.bounding_box       = true;
	this.config.label              = '%n';
	this.config.label_class        = 'imgmap_label';
	this.config.label_style        = 'font: bold 10px Arial';
	//this.config.label_style        = 'font-weight: bold; font-size: 10px; font-family: Arial';
	this.config.hint               = '#%n %h';
	this.config.draw_opacity       = '35';	
	this.config.norm_opacity       = '50';	
	this.config.highlight_opacity  = '65';
	this.config.cursor_default     = 'crosshair';		//auto/pointer	
	
	//browser sniff
	var ua = navigator.userAgent;
	this.isMSIE    = (navigator.appName == "Microsoft Internet Explorer");
	this.isMSIE5   = this.isMSIE && (ua.indexOf('MSIE 5')   != -1);
	this.isMSIE5_0 = this.isMSIE && (ua.indexOf('MSIE 5.0') != -1);
	this.isMSIE7   = this.isMSIE && (ua.indexOf('MSIE 7')   != -1);
	this.isGecko   = ua.indexOf('Gecko')  != -1;
	this.isSafari  = ua.indexOf('Safari') != -1;
	this.isOpera   = (typeof window.opera != 'undefined');

	this.addEvent(document, 'keydown', this.doc_keydown.bind(this));
	this.addEvent(document, 'keyup',   this.doc_keyup.bind(this));
	
	if (config) this.setup(config);
	
}


/**
 *	Return an object given by id or object itself.
 *	@date	22-02-2007 0:14:50
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.assignOID = function(objorid) {
	try {
		if (typeof objorid == 'undefined') {
			this.log("Undefined object passed to assignOID. Called from: " + arguments.callee.caller, 1);
			return null;
		}
		else if (typeof objorid == 'object') {
			return objorid;
		}
		else if (typeof objorid == 'string') {
			return document.getElementById(objorid);
		}
	}
	catch (err) {
		this.log("Error in assignOID", 1);
	}
	return null;
}


/**
 *	Main setup function.
 *	Can be called manually or constructor will call it.
 *	@date	22-02-2007 0:15:42
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.setup = function(config) {
	//this.config = config;
	for (var i in config) {
		this.config[i] = config[i];
	}
	//this.log('setup');
	//set container elements - supposedly they already exist in the DOM
	if (config) {
		this.pic_container = this.assignOID(config.pic_container);
		if (this.pic_container) {
			this.preview = document.createElement('DIV');
			this.pic_container.appendChild(this.preview);
		}
		
		this.form_container = this.assignOID(config.form_container);
		
		this.html_container = this.assignOID(config.html_container);
		if (this.html_container) {
			this.addEvent(this.html_container, 'blur',  this.html_container_blur.bind(this));
			this.addEvent(this.html_container, 'focus', this.html_container_focus.bind(this));
		}
		
		this.status_container = this.assignOID(config.status_container);
		//alert('bc:'+config.button_container.id);
		//alert(document.getElementById(config.button_container).tagName);
		//alert(document.getElementById(config.button_container).parentNode.tagName);
		this.button_container = this.assignOID(config.button_container);
		//console.log(this.button_container);
		//console.log(document.getElementById('button_container'));
		//alert(this.button_container.parentNode.parentNode.parentNode.parentNode.parentNode.tagName);

	}
	
	if (!this.config.baseroot) {
		//search for a base - theoretically there can only be one, but lets search
		//for the first non-empty
		var bases = document.getElementsByTagName('base');
		var base  = '';
		for (var i=0; i<bases.length; i++) {
			if (bases[i].href != '') {
				base = bases[i].href;
				//append slash if missing
				if (base.charAt(base.length-1) != '/') base+='/';
				break;
			}
		}
		//search for scripts
		var scripts = document.getElementsByTagName('script');
		for (var i=0; i<scripts.length; i++) {
			if (scripts[i].src && scripts[i].src.match(/imgmap\w*\.js(\?.*?)?$/)) {
				var src = scripts[i].src;
				//cut filename part, leave last slash
				src = src.substring(0, src.lastIndexOf('/') + 1);
				//set final baseroot path
				if (base != '' && src.indexOf('://') == -1) {
					this.config.baseroot = base + src;
				}
				else {
					this.config.baseroot = src;
				}
				//exit loop
				break;
			}
		}
	}

	//load excanvas js - as soon as possible
	if (this.isMSIE &&
		typeof window.CanvasRenderingContext2D == 'undefined' && typeof G_vmlCanvasManager == 'undefined') { 
		this.loadScript(this.config.baseroot + 'excanvas.js');
		//alert('loadcanvas');
	}
	//alert(this.config.baseroot);

	//load language js - as soon as possible
	if (this.config.lang == '') this.config.lang = 'en';
	this.loadScript(this.config.baseroot + 'lang_' + this.config.lang + '.js');
	
	if (!this.config.imgroot) {
		//set same as baseroot
		this.config.imgroot = this.config.baseroot;
	}
	
	//hook onload event - as late as possible
	this.addEvent(window, 'load', this.onLoad.bind(this));
	return true;
}


//currently unused
imgmap.prototype.retryDelayed = function(fn, delay, tries) {
	if (typeof fn.tries == 'undefined') fn.tries = 0;
	//alert(fn.tries+1);
	if (fn.tries++ < tries) {
		//alert('ss');
		window.setTimeout(function() {
		fn.apply(this);
		}, delay);
	}
}


/**
 *	Things to do when the page with scripts is loaded.
 *	@date	22-02-2007 0:16:22
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.onLoad = function(e) {
	if (this.isLoaded) return true;
	//this.log('readystate: ' +  document.readyState);
	if (typeof imgmapStrings == 'undefined') {
		if (this.cntReloads++ < 5) {
			var _this = this;
			//this.retryDelayed(_this.onLoad(), 1000, 3);
			window.setTimeout(function () {
				_this.onLoad(e);
				}
				,1200
				);
			this.log('Delaying onload (language not loaded, try: ' + this.cntReloads + ')');
			return false;
		}
	}
	//else
	try {
		this.loadStrings(imgmapStrings);
	}
	catch (err) {
		this.log("Unable to load language strings", 1);
	}
	
	//check if ExplorerCanvas correctly loaded - detect if browser supports canvas
	//alert(typeof G_vmlCanvasManager + this.isMSIE + typeof window.CanvasRenderingContext2D);
	if (this.isMSIE) {
		//alert('cccc');
		//alert(typeof G_vmlCanvasManager);
		if (typeof window.CanvasRenderingContext2D == 'undefined' && typeof G_vmlCanvasManager == 'undefined') {
			//alert('bbb');
			/*
			if (this.cntReloads++ < 5) {
				var _this = this;
				//this.retryDelayed(_this.onLoad(), 1000, 3);
				window.setTimeout(function () {
					_this.onLoad(e);
					}
					,1000
					);
				//alert('aaa');
				this.log('Delaying onload (excanvas not loaded, try: ' + this.cntReloads + ')');
				return false;
			}
			*/
			this.log(this.strings['ERR_EXCANVAS_LOAD'], 2);//critical error
		}
	}
	
	if (this.config.mode == 'highlighter') {
		//call global scope function
		imgmap_spawnObjects(this.config);	
	}
	
	else {
		if (this.button_container) {
			for (var i=0; i<this.config.buttons.length; i++) {
				if (this.config.buttons[i] == 'add') {
					try {
						var img = document.createElement('IMG');
						img.src     = this.config.imgroot + 'add.gif';
						//alert(img.src);
						//document.write(img.src);
						img.onclick = this.addNewArea.bind(this);
						//add custom callback
						if (this.config.button_callbacks[i])
							this.addEvent(img, 'click', this.config.button_callbacks[i]);
						img.alt     = this.strings['HINT_ADD'];
						img.title   = this.strings['HINT_ADD'];
						img.style.cursor = 'pointer';
						img.style.margin = '0 2px';
						this.button_container.appendChild(img);
						//this.button_container.style.font = '10px Impact';
						//this.button_container.innerHTML = 'aaa';
						//alert(this.button_container.parentNode.tagName);
						//alert(document.getElementById('button_container').parentNode.tagName);
						//alert('added');
					}
					catch (err) {
						this.log("Unable to add button (" + this.config.buttons[i] + ")", 1);
					}
				}
				else if (this.config.buttons[i] == 'delete') {
					try {
						var img = document.createElement('IMG');
						img.src     = this.config.imgroot + 'delete.gif';
						img.onclick = this.removeArea.bind(this);
						//add custom callback
						if (this.config.button_callbacks[i])
							this.addEvent(img, 'click', this.config.button_callbacks[i]);
						img.alt     = this.strings['HINT_DELETE'];
						img.title   = this.strings['HINT_DELETE'];
						img.style.cursor = 'pointer';
						img.style.margin = '0 2px';
						this.button_container.appendChild(img);
					}
					catch (err) {
						this.log("Unable to add button (" + this.config.buttons[i] + ")", 1);
					}
				}
				else if (this.config.buttons[i] == 'preview') {
					try {
						var img = document.createElement('IMG');
						img.src     = this.config.imgroot + 'zoom.gif';
						img.onclick = this.togglePreview.bind(this);
						//add custom callback
						if (this.config.button_callbacks[i])
							this.addEvent(img, 'click', this.config.button_callbacks[i]);
						img.alt     = this.strings['HINT_PREVIEW'];
						img.title   = this.strings['HINT_PREVIEW'];
						img.style.cursor = 'pointer';
						img.style.margin = '0 2px';
						this.i_preview = img;
						this.button_container.appendChild(img);
					}
					catch (err) {
						this.log("Unable to add button (" + this.config.buttons[i] + ")", 1);
					}
				}
				else if (this.config.buttons[i] == 'html') {
					try {
						var img = document.createElement('IMG');
						img.src     = this.config.imgroot + 'html.gif';
						//add custom callback
						if (this.config.button_callbacks[i])
							this.addEvent(img, 'click', this.config.button_callbacks[i]);
						img.alt     = this.strings['HINT_HTML'];
						img.title   = this.strings['HINT_HTML'];
						img.style.cursor = 'pointer';
						img.style.margin = '0 2px';
						this.button_container.appendChild(img);
					}
					catch (err) {
						this.log("Unable to add button (" + this.config.buttons[i] + ")", 1);
					}
				}
				else if (this.config.buttons[i] == 'clipboard') {
					try {
						var img = document.createElement('IMG');
						img.src     = this.config.imgroot + 'clipboard.gif';
						img.onclick = this.toClipBoard.bind(this);
						//add custom callback
						if (this.config.button_callbacks[i])
							this.addEvent(img, 'click', this.config.button_callbacks[i]);
						img.alt     = this.strings['HINT_CLIPBOARD'];
						img.title   = this.strings['HINT_CLIPBOARD'];
						img.style.cursor = 'pointer';
						img.style.margin = '0 2px';
						this.button_container.appendChild(img);
					}
					catch (err) {
						this.log("Unable to add button (" + this.config.buttons[i] + ")", 1);
					}
				}
			}//end foreach buttons
		}//end if button container
	}
	this.isLoaded = true;
	return true;
}


/**
 *	Attach new 'evt' event handler 'callback' to 'obj'
 *	@date	24-02-2007 21:16:20
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.addEvent = function(obj, evt, callback) {
	if (obj.attachEvent) {
		//Microsoft style registration model
		return obj.attachEvent("on" + evt, callback);
	}
	else if (obj.addEventListener) {
		//W3C style registration model
		obj.addEventListener(evt, callback, false);
		return true;
	}
	else {
		obj['on' + evt] = callback;
	}
}


/**
 *	We need this because load events for scripts function slightly differently.
 *	@link	http://dean.edwards.name/weblog/2006/06/again/
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	24-03-2007 11:02:21
 */
imgmap.prototype.addLoadEvent = function(obj, callback) {
	if (obj.attachEvent) {
		//Microsoft style registration model
		return obj.attachEvent("onreadystatechange", callback);
	}
	else if (obj.addEventListener) {
		//W3C style registration model
		obj.addEventListener('load', callback, false);
		return true;
	}
	else {
		obj['onload'] = callback;
	}
}


/**
 *	Include another js script into the current document.
 *	@date	22-02-2007 0:17:04
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.loadScript = function(url) {
	if (url == '') return false;
	if (this.loadedScripts[url] == 1) return true;//script already loaded
	this.log('Loading script: ' + url);
	//we might need this someday for safari?
	//var temp = '<script language="javascript" type="text/javascript" src="' + url + '"></script>';
	//document.write(temp);
		
	var head = document.getElementsByTagName('head')[0];
	var temp = document.createElement('SCRIPT');
	temp.setAttribute('language', 'javascript');
	temp.setAttribute('type', 'text/javascript');
	temp.setAttribute('src', url);
	//temp.setAttribute('defer', true);
	head.appendChild(temp);
	//this.loadedScripts[url] = 1;
	this.addLoadEvent(temp, this.script_load.bind(this));
	return true;
}


imgmap.prototype.script_load = function(e) {
	var obj = (document.all) ? window.event.srcElement : e.currentTarget;
	var url = obj.src;
	var complete = false;
	//alert(url);
	if (typeof obj.readyState != 'undefined') {
		//explorer
		if (obj.readyState == 'complete') {
			complete = true;
		}
	}
	else {
		//other browsers?
		complete = true;
	}
	if (complete) {
		this.loadedScripts[url] = 1;
		this.log('Loaded script: ' + url);
		return true;
	}
}


imgmap.prototype.loadStrings = function(obj) {
	for (var key in obj) {
		this.strings[key] = obj[key];
	}
}


imgmap.prototype.loadImage = function(img, imgw, imgh) {
	if (!this._getLastArea()) {
		//init with one new area if there was none editable
		this.addNewArea();
	}
	if (typeof img == 'string') {
		//there is an image given with url to load
		if (typeof this.pic == 'undefined') {
			this.pic = document.createElement('IMG');
			this.pic_container.appendChild(this.pic);
			//event handler hooking
			this.pic.onmousedown = this.img_mousedown.bind(this);
			this.pic.onmousemove = this.img_mousemove.bind(this);
			this.pic.style.cursor = this.config.cursor_default;
		}

		//calculate timestamp to bypass browser cache mechanism
		var ts = new Date().getTime();
		this.pic.src = img+'?'+ts;
		//if (imgw > 0) pic.setAttribute('width',  imgw);
		//if (imgh > 0) pic.setAttribute('height', imgh);
	}
	else if (typeof img == 'object') {
		//we have to use the src of it the image object  
		//if it is a tinymce object, it has no src but mce_src attribute!
		if (img.getAttribute('src') == '' && img.getAttribute('mce_src') != '') {
			this.loadImage(img.getAttribute('mce_src'), imgw, imgh);
		}
		else {
			this.loadImage(img.getAttribute('src'), imgw, imgh);
		}
	}
}


//there is an existing image object we want to handle with imgmap
imgmap.prototype.useImage = function(img) {
	//if (!this._getLastArea()) {
	//	//init with one new area if there was none editable
	//	this.addNewArea();
	//}
	img = this.assignOID(img);
	if (typeof img == 'object') {
		this.pic = img;
		//event handler hooking
		this.pic.onmousedown = this.img_mousedown.bind(this);
		this.pic.onmousemove = this.img_mousemove.bind(this);
		this.pic.style.cursor = this.config.cursor_default;
		this.pic_container = this.pic.parentNode;
	}
}


/**
 *	Prints out this.statusMessage to the status container, and window footer also if possible.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006.10.29. 14:59:17
 */   
imgmap.prototype.statusMessage = function(str) {
	if (this.status_container) this.status_container.innerHTML = str;
	window.defaultStatus = str;
}


/**
 *	Adds basic logging functionality using firebug console object if available.
 *	@date	20-02-2007 17:55:18
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */   
imgmap.prototype.log = function(obj, level) {
	if (level == '' || typeof level == 'undefined') level = 0;
	if (this.config.loglevel != -1 && level >= this.config.loglevel)
	this.logStore.push({level: level, obj: obj});
	if (typeof console == 'object') {
		console.log(obj);
	}
	else if (this.isOpera) {
		opera.postError(level + ': ' + obj);
	}
	else {
		if (level > 1) {
			//alert(level + ': ' + obj);
			//dump with all pevious errors:
			var msg = '';
			for (var i=0; i<this.logStore.length; i++) {
				msg+= this.logStore[i].level + ': ' + this.logStore[i].obj + "\n";
			}
			alert(msg);
		}
		else window.defaultStatus = (level + ': ' + obj);
	}
}


/**
 *	Produces the image map HTML output with the defined areas.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-06 15:10:27
 */
imgmap.prototype.getMapHTML = function() {
	if (this.mapname == '') {
		var now = new Date();
		this.mapname = 'imgmap' + now.getFullYear() + (now.getMonth()+1) + now.getDate() + now.getHours() + now.getMinutes() + now.getSeconds();
	}
	if (this.mapid == '') {
		this.mapid = this.mapname;
	}
	html = '<map id="'+this.mapid+'" name="'+this.mapname+'">' + this.getMapInnerHTML() + '</map>';
	//alert(html);
	return(html);
}


imgmap.prototype.getMapInnerHTML = function() {
	var html = '';
	//foreach area properties
	for (var i=0; i<this.props.length; i++) {
		if (this.props[i]) {
			if (this.props[i].getElementsByTagName('input')[2].value != '') {
				html+= '<area shape="' + 
					this.props[i].getElementsByTagName('select')[0].value + '" alt="' +
					this.props[i].getElementsByTagName('input')[4].value + '" coords="' +
					this.props[i].getElementsByTagName('input')[2].value + '" href="' +
					this.props[i].getElementsByTagName('input')[3].value + '" target="' +
					this.props[i].getElementsByTagName('select')[1].value + '" />';
			}
		}
	}
	//alert(html);
	return(html);
}

imgmap.prototype.getMapName = function() {
	return this.mapname;
}

imgmap.prototype.getMapId = function() {
	return this.mapid;
}

//bad inputs: 035,035 075,062
//150,217, 190,257, 150,297,110,257
imgmap.prototype._normCoords = function(coords) {
	coords = coords.replace(/(\d)(\D)+(\d)/g, "$1,$3");
	coords = coords.replace(/,(\D|0)+(\d)/g, ",$2");
	coords = coords.replace(/(\d)(\D)+,/g, "$1,");
	coords = coords.replace(/^(\D|0)+(\d)/g, "$2");
	//console.log(coords);
	return coords;
}


/**
 *	Sets the coordinates according to the given HTML map code or object.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-07 11:47:16
 */   
imgmap.prototype.setMapHTML = function(html) {
	//remove all areas
	this.removeAllAreas();
	//create temp div
	this.log('setmap');
	//this.log(html);
	var div = document.createElement('DIV');
	if (typeof html == 'string') {
		div.innerHTML = html;
	}
	else if (typeof html == 'object') {
		div.appendChild(html);
	}
	if (!div.getElementsByTagName('map')[0]) return false;
	this.mapname = div.getElementsByTagName('map')[0].name;
	this.mapid   = div.getElementsByTagName('map')[0].id;
	var newareas = div.getElementsByTagName('area');
	for (var i=0; i<newareas.length; i++) {
		//alert(newareas[i].getAttribute('coords'));
		id = this.addNewArea();//btw id == this.currentid, just this form is a bit clearer

		if (newareas[i].getAttribute('shape')) {
			shape = newareas[i].getAttribute('shape').toLowerCase();
			if (shape == 'rect')      shape = 'rectangle'
			else if (shape == 'circ') shape = 'circle'
			else if (shape == 'poly') shape = 'polygon';
		}
		else {
			shape = 'rectangle';
		} 
		this.props[id].getElementsByTagName('select')[0].value = shape;
		if (newareas[i].getAttribute('coords')) {
			//normalize coords
			var coords = this._normCoords(newareas[i].getAttribute('coords'));
			this.props[id].getElementsByTagName('input')[2].value  = coords;
		}
		if (newareas[i].getAttribute('href')) this.props[id].getElementsByTagName('input')[3].value  = newareas[i].getAttribute('href');
		if (newareas[i].getAttribute('alt'))  this.props[id].getElementsByTagName('input')[4].value  = newareas[i].getAttribute('alt');

		if (newareas[i].getAttribute('target')) {
			target = newareas[i].getAttribute('target').toLowerCase();
			if (target == '') target = '_self';
		}
		else {
			target = '_self';
		}
		this.props[id].getElementsByTagName('select')[1].value = target;
		this.initArea(id, shape);
		this._recalculate(id);//contains repaint
		this.relaxArea(id);
		if (this.html_container) this.html_container.value = this.getMapHTML();
	}
}


/**
 *	Preview image with imagemap applied.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-06 14:51:01
 *	@url	http://www.quirksmode.org/bugreports/archives/2005/03/Usemap_attribute_wrongly_case_sensitive.html 
 */
imgmap.prototype.togglePreview = function() {
	if (!this.pic) return false;//exit if pic is undefined
	if (this.viewmode == 0) {
		//hide canvas elements and labels
		for (var i=0; i<this.areas.length; i++) {
			if (this.areas[i]) {
				this.areas[i].style.display = 'none';
				if (this.areas[i].label) this.areas[i].label.style.display = 'none';
			}
		}
		//disable form elements (inputs and selects)
		var nodes = this.form_container.getElementsByTagName("input");
		//nodes = nodes.join(this.form_container.getElementsByTagName("select"));
		for (var i=0; i<nodes.length; i++) {
			nodes[i].disabled = true;
		}
		var nodes = this.form_container.getElementsByTagName("select");
		for (var i=0; i<nodes.length; i++) {
			nodes[i].disabled = true;
		}
		//activate image map
		this.preview.innerHTML = this.getMapHTML();
		this.pic.setAttribute('usemap', '#' + this.mapname, 0);
		this.pic.onmousedown   = null;
		this.pic.onmousemove   = null;
		this.pic.style.cursor  = 'auto';
		//change preview button
		this.viewmode = 1;
		this.i_preview.src = this.config.imgroot + 'edit.gif';
		this.statusMessage(this.strings['PREVIEW_MODE']);
	}
	else {
		//show canvas elements
		for (var i=0; i<this.areas.length; i++) {
			if (this.areas[i]) {
				this.areas[i].style.display = '';
				if (this.areas[i].label && this.config.label) this.areas[i].label.style.display = '';
			}
		}
		//enable form elements
		var nodes = this.form_container.getElementsByTagName("input");
		for (var i=0; i<nodes.length; i++) {
			nodes[i].disabled = false;
		}
		var nodes = this.form_container.getElementsByTagName("select");
		for (var i=0; i<nodes.length; i++) {
			nodes[i].disabled = false;
		}
		//clear image map
		this.preview.innerHTML = '';
		//hook back event handlers
		this.pic.onmousedown = this.img_mousedown.bind(this);
		this.pic.onmousemove = this.img_mousemove.bind(this);
		this.pic.style.cursor  = this.config.cursor_default;
		//change preview button
		this.viewmode = 0;
		this.i_preview.src = this.config.imgroot + 'zoom.gif';
		this.statusMessage(this.strings['DESIGN_MODE']);
	}
}


/**
 *	Puts a new properties row, and adds a new CANVAS
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-06 16:49:25  
 */ 
imgmap.prototype.addNewArea = function() {
	//alert('a');
		if (this.viewmode == 1) return;//exit if preview mode
		var lastarea = this._getLastArea();
		var id = this.areas.length;
		//alert(id);
		
		//insert new unknown area (will be initialized at mousedown)
		this.areas[id] = document.createElement('DIV');
		this.areas[id].id        = this.mapname + 'area' + id;
		this.areas[id].aid       = id;
		this.areas[id].shape     = 'unknown';
		
		//insert props row
		this.props[id] = document.createElement('DIV');
		if (this.form_container)
			this.form_container.appendChild(this.props[id]);
		this.props[id].id        = 'img_area_' + id;
		this.props[id].aid       = id;
		this.props[id].className = 'img_area';
		//hook event handlers
		this.addEvent(this.props[id], 'mouseover', this.img_area_mouseover.bind(this));
		this.addEvent(this.props[id], 'mouseout',  this.img_area_mouseout.bind(this));
		this.addEvent(this.props[id], 'click',     this.img_area_click.bind(this));
		this.props[id].innerHTML = '\
			<input type="text"  name="img_id" class="img_id" value="' + id + '" readonly="1"/>\
			<input type="radio" name="img_active" class="img_active" id="img_active_'+id+'" value="'+id+'">\
			Shape:	<select name="img_shape" class="img_shape">\
				<option value="rectangle" >rectangle</option>\
				<option value="circle"    >circle</option>\
				<option value="polygon"   >polygon</option>\
				</select>\
			Coords: <input type="text" name="img_coords" class="img_coords" value="">\
			Href: <input type="text" name="img_href" class="img_href" value="">\
			Alt: <input type="text" name="img_alt" class="img_alt" value="">\
			Target:	<select name="img_target" class="img_target">\
				<option value="_self"  >this window</option>\
				<option value="_blank" >new window</option>\
				<option value="_top"   >top window</option>\
				</select>';
		//hook more event handlers
		this.addEvent(this.props[id].getElementsByTagName('input')[1],  'keydown', this.img_area_keydown.bind(this));
		this.addEvent(this.props[id].getElementsByTagName('input')[2],  'keydown', this.img_coords_keydown.bind(this));
		this.addEvent(this.props[id].getElementsByTagName('input')[2],  'blur', this.img_area_blur.bind(this));
		this.addEvent(this.props[id].getElementsByTagName('input')[3],  'blur', this.img_area_blur.bind(this));
		this.addEvent(this.props[id].getElementsByTagName('input')[4],  'blur', this.img_area_blur.bind(this));
		this.addEvent(this.props[id].getElementsByTagName('select')[1], 'blur', this.img_area_blur.bind(this));
		//set shape same as lastarea - just for convenience
		if (lastarea) this.props[id].getElementsByTagName('select')[0].value = lastarea.shape;
		//alert(this.props[id].parentNode.innerHTML);
		this.form_selectRow(id, true);
		this.currentid = id;
		return(id);
}


imgmap.prototype.initArea = function(id, shape) {
	//remove preinited dummy div or already placed canvas
	if (this.areas[id].parentNode) this.areas[id].parentNode.removeChild(this.areas[id]);
	if (this.areas[id].label) this.areas[id].label.parentNode.removeChild(this.areas[id].label);
	this.areas[id] = null;
	//create CANVAS node
	this.areas[id] = document.createElement('CANVAS');
	this.pic.parentNode.appendChild(this.areas[id]);
	this.pic.parentNode.style.position = 'relative';
	//alert('init' + typeof G_vmlCanvasManager);
	if (typeof G_vmlCanvasManager != "undefined") {
		//override CANVAS with VML object
		this.areas[id] = G_vmlCanvasManager.initElement(this.areas[id]);
		//this.areas[id] = this.pic.parentNode.lastChild;
	}
	this.areas[id].id        = this.mapname + 'area' + id;
	this.areas[id].aid       = id;
	this.areas[id].shape     = shape;
	this.areas[id].style.position = 'absolute';
	this.areas[id].style.top      = this.pic.offsetTop  + 'px';
	this.areas[id].style.left     = this.pic.offsetLeft + 'px';
	this._setopacity(this.areas[id], this.config.CL_DRAW_BG, this.config.draw_opacity);
	//hook event handlers
	this.areas[id].onmousedown = this.area_mousedown.bind(this);
	this.areas[id].onmousemove = this.area_mousemove.bind(this);
	//initialize memory object
	this.memory[id] = new Object();
	this.memory[id].downx   = 0;
	this.memory[id].downy   = 0;
	this.memory[id].left    = 0;
	this.memory[id].top     = 0;
	this.memory[id].width   = 0;
	this.memory[id].height  = 0;
	this.memory[id].xpoints = new Array();
	this.memory[id].ypoints = new Array();
	//create label node
	this.areas[id].label = document.createElement('DIV');
	this.pic.parentNode.appendChild(this.areas[id].label);
	this.areas[id].label.className      = this.config.label_class;
	this.assignCSS(this.areas[id].label,  this.config.label_style);
	this.areas[id].label.style.position = 'absolute';
}


/**
 *	Resets area border to a normal state after drawing .
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	15-02-2007 22:07:28
 */
imgmap.prototype.relaxArea = function(id) {
	if (this.areas[id].shape == 'rectangle') {
		this.areas[id].style.borderWidth = '1px';
		this.areas[id].style.borderStyle = 'solid';
		this.areas[id].style.borderColor = this.config.CL_NORM_SHAPE;
	}
	else if (this.areas[id].shape == 'circle' || this.areas[id].shape == 'polygon') {
		if (this.config.bounding_box == true) {
			this.areas[id].style.borderWidth = '1px';
			this.areas[id].style.borderStyle = 'solid';
			this.areas[id].style.borderColor = this.config.CL_NORM_BOX;
		}
		else {
			//clear border
			this.areas[id].style.border = '';
		}
	}
	this._setopacity(this.areas[id], this.config.CL_NORM_BG, this.config.norm_opacity);
}


/**
 *	Resets area border and opacity of all areas.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	23-04-2007 23:31:09
 */
imgmap.prototype.relaxAllAreas = function() {
	for (var i=0; i<this.areas.length; i++) {
		if (this.areas[i]) {
			this.relaxArea(i);
		}
	}
}


imgmap.prototype._setopacity = function(area, bgcolor, pct) {
	area.style.backgroundColor = bgcolor;
	area.style.opacity = '.'+pct;
	area.style.filter  = 'alpha(opacity='+pct+')';
}


/**
 *	Removes the actively selected area.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	11-02-2007 20:40:58
 */
imgmap.prototype.removeArea = function() {
	if (this.viewmode == 1) return;//exit if preview mode
	var id = this.currentid;
	if (this.props[id]) {
		//shall we leave the last one?
		var pprops = this.props[id].parentNode;
		pprops.removeChild(this.props[id]);
		var lastid = pprops.lastChild.aid;
		this.props[id] = null;
		try {
			this.form_selectRow(lastid, true);
			this.currentid = lastid;
		}
		catch (err) {
			//alert('noparent');
		}
		
		try {
			//remove area and label
			this.areas[id].parentNode.removeChild(this.areas[id]);
			this.areas[id].label.parentNode.removeChild(this.areas[id].label);
		}
		catch (err) {
			//alert('noparent');
		}
		this.areas[id] = null;
		//update grand html
		if (this.html_container) this.html_container.value = this.getMapHTML();
	}
}


/**
 *	Removes all areas.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-07 11:55:34
 */
imgmap.prototype.removeAllAreas = function() {
	for (var i = 0; i < this.props.length; i++) {
		if (this.props[i]) {
			if (this.props[i].parentNode) this.props[i].parentNode.removeChild(this.props[i]);
			if (this.areas[i].parentNode) this.areas[i].parentNode.removeChild(this.areas[i]);
			if (this.areas[i].label) this.areas[i].label.parentNode.removeChild(this.areas[i].label);
			this.props[i] = null;
			this.areas[i] = null;
			if (this.props.length > 0 && this.props[i]) this.form_selectRow((this.props.length - 1), true);
		}
	}
}


imgmap.prototype._putlabel = function(id) {
	if (this.viewmode == 1) return;//exit if preview mode
	try {
		if (this.config.label == '' || this.config.label == false) {
			this.areas[id].label.innerHTML     = '';
			this.areas[id].label.style.display = 'none';
		}
		else {
			this.areas[id].label.style.display = '';
			var label = this.config.label;
			label = label.replace(/%n/g, String(id));
			label = label.replace(/%c/g, String(this.props[id].getElementsByTagName('input')[2].value));
			label = label.replace(/%h/g, String(this.props[id].getElementsByTagName('input')[3].value));
			label = label.replace(/%a/g, String(this.props[id].getElementsByTagName('input')[4].value));
			this.areas[id].label.innerHTML = label;
		}
		//align to the top left corner
		this.areas[id].label.style.top  = this.areas[id].style.top;
		this.areas[id].label.style.left = this.areas[id].style.left;
	}
	catch (err) {
		this.log("Error putting label", 1);
	}
}


imgmap.prototype._puthint = function(id) {
	try {
		if (this.config.hint == '' || this.config.hint == false) {
			this.areas[id].title = '';
			this.areas[id].alt   = '';
		}
		else {
			var hint = this.config.hint;
			hint = hint.replace(/%n/g, String(id));
			hint = hint.replace(/%c/g, String(this.props[id].getElementsByTagName('input')[2].value));
			hint = hint.replace(/%h/g, String(this.props[id].getElementsByTagName('input')[3].value));
			hint = hint.replace(/%a/g, String(this.props[id].getElementsByTagName('input')[4].value));
			this.areas[id].title = hint;
			this.areas[id].alt   = hint;
		}
	}
	catch (err) {
		this.log("Error putting hint", 1);
	}
}


imgmap.prototype._repaintAll = function() {
	for (var i=0; i<this.areas.length; i++) {
		if (this.areas[i]) {
			this._repaint(this.areas[i], this.config.CL_NORM_SHAPE);
		}
	}
}


imgmap.prototype._repaint = function(area, color, x, y) {
	if (area.shape == 'circle') {
		var width  = parseInt(area.style.width);
		var radius = Math.floor(width/2) - 1;
		//get canvas context
		//alert(area.tagName);
		var ctx = area.getContext("2d");
		//clear canvas
		ctx.clearRect(0, 0, width, width);
		//draw circle
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.arc(radius, radius, radius, 0, Math.PI*2, 0);
		ctx.stroke();
		ctx.closePath();
		//draw center
		ctx.strokeStyle = this.config.CL_KNOB;
		ctx.strokeRect(radius, radius, 1, 1);
		//put label
		this._putlabel(area.aid);
		this._puthint(area.aid);
	}
	else if (area.shape == 'rectangle') {
		//put label
		this._putlabel(area.aid);
		this._puthint(area.aid);
	}
	else if (area.shape == 'polygon') {
		var width  =  parseInt(area.style.width);
		var height =  parseInt(area.style.height);
		var left   =  parseInt(area.style.left);
		var top    =  parseInt(area.style.top);
		//get canvas context
		var ctx = area.getContext("2d");
		//clear canvas
		ctx.clearRect(0, 0, width, height);
		//draw polygon
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.moveTo(area.xpoints[0] - left, area.ypoints[0] - top);
		for (var i=1; i<area.xpoints.length; i++) {
			ctx.lineTo(area.xpoints[i] - left , area.ypoints[i] - top);
		}
		if (this.is_drawing == this.DM_POLYGON_DRAW || this.is_drawing == this.DM_POLYGON_LASTDRAW) {
			//only draw to current position if not moving
			ctx.lineTo(x - left - 5 , y - top - 5);
		}
		ctx.lineTo(area.xpoints[0] - left , area.ypoints[0] - top);
		ctx.stroke();
		ctx.closePath();
		//put label
		this._putlabel(area.aid);
		this._puthint(area.aid);
	}
}


/**
 *	Updates Area coordinates on the properties fieldset.
 *	Called when needed, eg. on mousemove, mousedown.
 *	Also updates html container value.
 *	@date	2006.10.24. 22:39:27
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype._updatecoords = function() {
	var input  = this.props[this.currentid].getElementsByTagName('input')[2];
	var left   = parseInt(this.areas[this.currentid].style.left);
	var top    = parseInt(this.areas[this.currentid].style.top);
	var height = parseInt(this.areas[this.currentid].style.height);
	var width  = parseInt(this.areas[this.currentid].style.width);
	
	if (this.areas[this.currentid].shape == 'rectangle') {
		input.value = left + ',' + top + ',' + (left + width) + ',' + (top + height);
		this.areas[this.currentid].lastInput = input.value;
	}
	else if (this.areas[this.currentid].shape == 'circle') {
		var radius = Math.floor(width/2) - 1;
		input.value = (left + radius) + ',' +	(top + radius) + ',' + radius;
		this.areas[this.currentid].lastInput = input.value;
	}
	else if (this.areas[this.currentid].shape == 'polygon') {
		input.value = '';
		for (var i=0; i<this.areas[this.currentid].xpoints.length; i++) {
			input.value+= this.areas[this.currentid].xpoints[i] + ',' + this.areas[this.currentid].ypoints[i] + ',';
		}
		input.value = input.value.substring(0, input.value.length - 1);
		this.areas[this.currentid].lastInput = input.value;
	}
	if (this.html_container) this.html_container.value = this.getMapHTML();
}


/**
 *	Updates the visual representation of the area with the given id according
 *	to the input element that contains the coordinates.
 *	@date	2006.10.24. 22:46:55
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype._recalculate = function(id) {
	var input   = this.props[id].getElementsByTagName('input')[2];
	input.value = this._normCoords(input.value);
	var coords  = input.value;
	var parts   = coords.split(',');
	try {
		if (this.areas[id].shape == 'rectangle') {
			if (parts.length != 4)   throw "invalid coords";
			if (parseInt(parts[0]) > parseInt(parts[2])) throw "invalid coords";
			if (parseInt(parts[1]) > parseInt(parts[3])) throw "invalid coords";
			this.areas[id].style.left   = this.pic.offsetLeft + parseInt(parts[0]) + 'px';
			this.areas[id].style.top    = this.pic.offsetTop  + parseInt(parts[1]) + 'px';
			this.areas[id].style.width  = (parts[2] - parts[0]) + 'px';
			this.areas[id].style.height = (parts[3] - parts[1]) + 'px';
			this.areas[id].setAttribute('width',  (parts[2] - parts[0]));
			this.areas[id].setAttribute('height', (parts[3] - parts[1]));
			this._repaint(this.areas[id], this.config.CL_NORM_SHAPE);
		}
		else if (this.areas[id].shape == 'circle') {
			if (parts.length != 3)      throw "invalid coords";
			if (parseInt(parts[2]) < 0) throw "invalid coords";
			var width = 2 * (1 * parts[2] + 1);
			//alert(parts[2]);
			//alert(width);
			this.areas[id].style.width  = width + 'px';
			this.areas[id].style.height = width + 'px';
			this.areas[id].setAttribute('width',  width);
			this.areas[id].setAttribute('height', width);
			this.areas[id].style.left   = this.pic.offsetLeft + parseInt(parts[0]) - width/2 + 'px';
			this.areas[id].style.top    = this.pic.offsetTop  + parseInt(parts[1]) - width/2 + 'px';
			this._repaint(this.areas[id], this.config.CL_NORM_SHAPE);
		}
		else if (this.areas[id].shape == 'polygon') {
			if (parts.length < 2) throw "invalid coords";
			this.areas[id].xpoints = new Array();
			this.areas[id].ypoints = new Array();
			for (var i=0; i<parts.length; i+=2) {
				this.areas[id].xpoints[this.areas[id].xpoints.length]  = this.pic.offsetLeft + parseInt(parts[i]);
				this.areas[id].ypoints[this.areas[id].ypoints.length]  = this.pic.offsetTop  + parseInt(parts[i+1]); 
				this._polygongrow(this.areas[id], parts[i], parts[i+1]);
			}
			this._polygonshrink(this.areas[id]);//includes repaint
		}
	}
	catch (err) {
		this.log(err.message, 1);
		this.statusMessage(this.strings['ERR_INVALID_COORDS']);
		if (this.areas[id].lastInput) input.value = this.areas[id].lastInput;
		this._repaint(this.areas[id], this.config.CL_NORM_SHAPE);
		return;
	}
	//on success update lastInput
	this.areas[id].lastInput = input.value;
}


imgmap.prototype._polygongrow = function(area, newx, newy) {
	var xdiff = newx - parseInt(area.style.left);
	var ydiff = newy - parseInt(area.style.top );
	var pad   = 2;
	var pad2  = pad * 2;
	
	if (newx < parseInt(area.style.left)) {
		area.style.left   = newx - pad + 'px';
		area.style.width  = parseInt(area.style.width)  + Math.abs(xdiff) + pad2 + 'px';
		area.setAttribute('width',  parseInt(area.style.width));
	}
	if (newy < parseInt(area.style.top)) {
		area.style.top    = newy - pad + 'px';
		area.style.height = parseInt(area.style.height) + Math.abs(ydiff) + pad2 + 'px';
		area.setAttribute('height',  parseInt(area.style.height));
	}
	if (newx > parseInt(area.style.left) + parseInt(area.style.width)) {
		area.style.width  = newx - parseInt(area.style.left) + pad2 + 'px';
		area.setAttribute('width',  parseInt(area.style.width));
	}
	if (newy > parseInt(area.style.top) + parseInt(area.style.height)) {
		area.style.height = newy - parseInt(area.style.top) + pad2 + 'px';
		area.setAttribute('height',  parseInt(area.style.height));
	}
}


imgmap.prototype._polygonshrink = function(area) {
	area.style.left = (area.xpoints[0] + 1) + 'px';
	area.style.top  = (area.ypoints[0] + 1) + 'px';
	area.style.height = '0px';
	area.style.width  = '0px';
	area.setAttribute('height', '0');
	area.setAttribute('width',  '0');
	for (var i=0; i<area.xpoints.length; i++) {
		this._polygongrow(area, area.xpoints[i], area.ypoints[i]);
	}
	this._repaint(area, this.config.CL_NORM_SHAPE);
}


imgmap.prototype.img_mousemove = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	//event.x is relative to parent element, but page.x is NOT
	//pos coordinates are the same absolute coords, offset coords are relative to parent
	var pos = this._getPos(this.pic);
	var x = (window.event) ? (window.event.x - this.pic.offsetLeft) : (e.pageX - pos.x);
	var y = (window.event) ? (window.event.y - this.pic.offsetTop)  : (e.pageY - pos.y);
	x = x + this.pic_container.scrollLeft;
	y = y + this.pic_container.scrollTop;
	
	//this.log(x + ' - ' + y + ': ' + this.memory[this.currentid].downx + ' - ' +this.memory[this.currentid].downy);
	
	//exit if outside image
	if (x<0 || y<0 || x>this.pic.width || y>this.pic.height) return;
	
	//old dimensions that need to be updated in this function
	if (this.memory[this.currentid]) {
		var top    = this.memory[this.currentid].top;
		var left   = this.memory[this.currentid].left;
		var height = this.memory[this.currentid].height;
		var width  = this.memory[this.currentid].width;
	}
	
	if (this.is_drawing == this.DM_RECTANGLE_DRAW) {
		//rectangle mode
		var xdiff = x - this.memory[this.currentid].downx;
		var ydiff = y - this.memory[this.currentid].downy;
		//alert(xdiff);
		this.areas[this.currentid].style.width  = Math.abs(xdiff) + 'px';
		this.areas[this.currentid].style.height = Math.abs(ydiff) + 'px';
		this.areas[this.currentid].setAttribute('width',  Math.abs(xdiff));
		this.areas[this.currentid].setAttribute('height', Math.abs(ydiff));
		if (xdiff < 0) {
			this.areas[this.currentid].style.left = (x + 1) + 'px';
		}
		if (ydiff < 0) {
			this.areas[this.currentid].style.top  = (y + 1) + 'px';
		}
	}
	else if (this.is_drawing == this.DM_SQUARE_DRAW) {
		//square mode - align to shorter side 
		var xdiff = x - this.memory[this.currentid].downx;
		var ydiff = y - this.memory[this.currentid].downy;
		var diff;
		if (Math.abs(xdiff) < Math.abs(ydiff)) {
			diff = Math.abs(xdiff);
		}
		else {
			diff = Math.abs(ydiff);
		}
		//alert(xdiff);
		this.areas[this.currentid].style.width  = diff + 'px';
		this.areas[this.currentid].style.height = diff + 'px';
		this.areas[this.currentid].setAttribute('width',  diff);
		this.areas[this.currentid].setAttribute('height', diff);
		if (xdiff < 0) {
			this.areas[this.currentid].style.left = (this.memory[this.currentid].downx + diff*-1) + 'px';
		}
		if (ydiff < 0) {
			this.areas[this.currentid].style.top = (this.memory[this.currentid].downy + diff*-1 + 1) + 'px';
		}
	}
	else if (this.is_drawing == this.DM_POLYGON_DRAW) {
		//polygon mode
		this._polygongrow(this.areas[this.currentid], x, y);
	}
	else if (this.is_drawing == this.DM_RECTANGLE_MOVE || this.is_drawing == this.DM_SQUARE_MOVE) {
		var x = x - this.memory[this.currentid].rdownx;
		var y = y - this.memory[this.currentid].rdowny;
		if (x + width > this.pic.width || y + height > this.pic.height) return;
		if (x < 0 || y < 0) return;
		//this.log(x + ' - '+width+ '+'+this.memory[this.currentid].rdownx +'='+xdiff );
		this.areas[this.currentid].style.left = x + 1 + 'px';
		this.areas[this.currentid].style.top  = y + 1 + 'px';
	}
	else if (this.is_drawing == this.DM_POLYGON_MOVE) {
		var x = x - this.memory[this.currentid].rdownx;
		var y = y - this.memory[this.currentid].rdowny;
		if (x + width > this.pic.width || y + height > this.pic.height) return;
		if (x < 0 || y < 0) return;
		var xdiff = x - left;
		var ydiff = y - top;
		for (var i=0; i<this.areas[this.currentid].xpoints.length; i++) {
			this.areas[this.currentid].xpoints[i] = this.memory[this.currentid].xpoints[i] + xdiff;
			this.areas[this.currentid].ypoints[i] = this.memory[this.currentid].ypoints[i] + ydiff;
		}
		this.areas[this.currentid].style.left = x + 1 + 'px';
		this.areas[this.currentid].style.top  = y + 1 + 'px';
	}
	else if (this.is_drawing == this.DM_SQUARE_RESIZE_LEFT) {
		var diff = x - left;
		//alert(diff);
		if ((width  + (-1 * diff)) > 0) {
			//real resize left
			this.areas[this.currentid].style.left   = x + 1 + 'px';
			this.areas[this.currentid].style.top    = (top    + (diff/2)) + 'px';
			this.areas[this.currentid].style.width  = (width  + (-1 * diff)) + 'px';
			this.areas[this.currentid].style.height = (height + (-1 * diff)) + 'px';
			this.areas[this.currentid].setAttribute('width',   parseInt(this.areas[this.currentid].style.width));
			this.areas[this.currentid].setAttribute('height',  parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width  = 0;
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].left   = x;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_SQUARE_RESIZE_RIGHT;
		}
	}
	else if (this.is_drawing == this.DM_SQUARE_RESIZE_RIGHT) {
		var diff = x - left - width;
		if ((width  + (diff)) - 1 > 0) {
			//real resize right
			this.areas[this.currentid].style.top    = (top    + (-1* diff/2)) + 'px';
			this.areas[this.currentid].style.width  = (width  + (diff)) - 1 + 'px';
			this.areas[this.currentid].style.height = (height + (diff)) + 'px';
			this.areas[this.currentid].setAttribute('width',   parseInt(this.areas[this.currentid].style.width));
			this.areas[this.currentid].setAttribute('height',  parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width  = 0;
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].left   = x;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_SQUARE_RESIZE_LEFT;
		}
	}
	else if (this.is_drawing == this.DM_SQUARE_RESIZE_TOP) {
		var diff = y - top;
		if ((width  + (-1 * diff)) > 0) {
			//real resize top
			this.areas[this.currentid].style.top    = y + 1 + 'px';
			this.areas[this.currentid].style.left   = (left   + (diff/2)) + 'px';
			this.areas[this.currentid].style.width  = (width  + (-1 * diff)) + 'px';
			this.areas[this.currentid].style.height = (height + (-1 * diff)) + 'px';
			this.areas[this.currentid].setAttribute('width',   parseInt(this.areas[this.currentid].style.width));
			this.areas[this.currentid].setAttribute('height',  parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width  = 0;
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].left   = x;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_SQUARE_RESIZE_BOTTOM;
		}
	}
	else if (this.is_drawing == this.DM_SQUARE_RESIZE_BOTTOM) {
		var diff = y - top - height;
		if ((width  + (diff)) - 1 > 0) {
			//real resize bottom
			this.areas[this.currentid].style.left   = (left   + (-1* diff/2)) + 'px';
			this.areas[this.currentid].style.width  = (width  + (diff)) - 1 + 'px';
			this.areas[this.currentid].style.height = (height + (diff)) - 1 + 'px';
			this.areas[this.currentid].setAttribute('width',   parseInt(this.areas[this.currentid].style.width));
			this.areas[this.currentid].setAttribute('height',  parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width  = 0;
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].left   = x;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_SQUARE_RESIZE_TOP;
		}
	}
	else if (this.is_drawing == this.DM_RECTANGLE_RESIZE_LEFT) {
		//balszel mozgatas
		var xdiff = x - left;
		if (width + (-1 * xdiff) > 0) {
			//real resize left
			this.areas[this.currentid].style.left = x + 1 + 'px';
			this.areas[this.currentid].style.width = width + (-1 * xdiff) + 'px';
			this.areas[this.currentid].setAttribute('width',  parseInt(this.areas[this.currentid].style.width));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width = 0;
			this.memory[this.currentid].left  = x;
			this.is_drawing = this.DM_RECTANGLE_RESIZE_RIGHT;
		}
	}
	else if (this.is_drawing == this.DM_RECTANGLE_RESIZE_RIGHT) {
		var xdiff = x - left - width;
		if ((width  + (xdiff)) - 1 > 0) {
			//real resize right
			this.areas[this.currentid].style.width  = (width  + (xdiff)) - 1 + 'px';
			this.areas[this.currentid].setAttribute('width',  parseInt(this.areas[this.currentid].style.width));
		}
		else {
			//jump to another state
			this.memory[this.currentid].width = 0;
			this.memory[this.currentid].left  = x;
			this.is_drawing = this.DM_RECTANGLE_RESIZE_LEFT;
		}
	}
	else if (this.is_drawing == this.DM_RECTANGLE_RESIZE_TOP) {
		var ydiff = y - top;
		if ((height + (-1 * ydiff)) > 0) {
			//real resize top
			this.areas[this.currentid].style.top   = y + 1 + 'px';
			this.areas[this.currentid].style.height = (height + (-1 * ydiff)) + 'px';
			this.areas[this.currentid].setAttribute('height', parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_RECTANGLE_RESIZE_BOTTOM;
		}
	}
	else if (this.is_drawing == this.DM_RECTANGLE_RESIZE_BOTTOM) {
		var ydiff = y - top - height;
		if ((height + (ydiff)) - 1 > 0) {
			//real resize bottom
			this.areas[this.currentid].style.height = (height + (ydiff)) - 1 + 'px';
			this.areas[this.currentid].setAttribute('height', parseInt(this.areas[this.currentid].style.height));
		}
		else {
			//jump to another state
			this.memory[this.currentid].height = 0;
			this.memory[this.currentid].top    = y;
			this.is_drawing = this.DM_RECTANGLE_RESIZE_TOP;
		}
	}
	
	//repaint canvas elements
	if (this.is_drawing) {
		this._repaint(this.areas[this.currentid], this.config.CL_DRAW_SHAPE, x, y);
		this._updatecoords();
	}

}


imgmap.prototype.img_mousedown = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	if (!this.props[this.currentid]) return;
	var pos = this._getPos(this.pic);
	var x = (window.event) ? (window.event.x - this.pic.offsetLeft) : (e.pageX - pos.x);
	var y = (window.event) ? (window.event.y - this.pic.offsetTop)  : (e.pageY - pos.y);
	x = x + this.pic_container.scrollLeft;
	y = y + this.pic_container.scrollTop;

	//this.statusMessage(x + ' - ' + y + ': ' + this.props[this.currentid].getElementsByTagName('select')[0].value);

	if (this.is_drawing == this.DM_POLYGON_DRAW) {
		//its not finish state yet
		this.areas[this.currentid].xpoints[this.areas[this.currentid].xpoints.length] = x - 5;
		this.areas[this.currentid].ypoints[this.areas[this.currentid].ypoints.length] = y - 5;
	}
	else if (this.is_drawing && this.is_drawing != this.DM_POLYGON_DRAW) {
		//finish state
		if (this.is_drawing == this.DM_POLYGON_LASTDRAW) {
			//add last controlpoint and update coords
			this.areas[this.currentid].xpoints[this.areas[this.currentid].xpoints.length] = x - 5;
			this.areas[this.currentid].ypoints[this.areas[this.currentid].ypoints.length] = y - 5;
			this._updatecoords();
			this.is_drawing   = 0;
			this._polygonshrink(this.areas[this.currentid]);
		}
		this.is_drawing   = 0;
		this.statusMessage(this.strings['READY']);
		this.relaxArea(this.currentid);
		if (this.areas[this.currentid] == this._getLastArea()) {
			this.addNewArea();
			return;
		}
	}
	else if (this.props[this.currentid].getElementsByTagName('select')[0].value == 'polygon') {
		if (this.areas[this.currentid].shape != this.props[this.currentid].getElementsByTagName('select')[0].value) {
			//initialize polygon area
			this.initArea(this.currentid, 'polygon');
		}
		this.is_drawing   = this.DM_POLYGON_DRAW;
		this.statusMessage(this.strings['POLYGON_DRAW']);
		
		this.areas[this.currentid].style.left = x + 'px';
		this.areas[this.currentid].style.top  = y + 'px';
		if (this.config.bounding_box == true) {
			this.areas[this.currentid].style.borderWidth = '1px';
			this.areas[this.currentid].style.borderStyle = 'dotted';
			this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
		}
		this.areas[this.currentid].style.width  = 0;
		this.areas[this.currentid].style.height = 0;
		this.areas[this.currentid].xpoints = new Array();
		this.areas[this.currentid].ypoints = new Array();
		this.areas[this.currentid].xpoints[0] = x;
		this.areas[this.currentid].ypoints[0] = y;
	}
	else if (this.props[this.currentid].getElementsByTagName('select')[0].value == 'rectangle') {
		if (this.areas[this.currentid].shape != this.props[this.currentid].getElementsByTagName('select')[0].value) {
			//initialize rectangle area
			this.initArea(this.currentid, 'rectangle');
		}
		this.is_drawing   = this.DM_RECTANGLE_DRAW;
		this.statusMessage(this.strings['RECTANGLE_DRAW']);
		
		this.areas[this.currentid].style.left = x + 'px';
		this.areas[this.currentid].style.top  = y + 'px';
		this.areas[this.currentid].style.borderWidth = '1px';
		this.areas[this.currentid].style.borderStyle = 'dotted';
		this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
		this.areas[this.currentid].style.width  = 0;
		this.areas[this.currentid].style.height = 0;
	}
	else if (this.props[this.currentid].getElementsByTagName('select')[0].value == 'circle') {
		if (this.areas[this.currentid].shape != this.props[this.currentid].getElementsByTagName('select')[0].value) {
			//initialize circle area
			this.initArea(this.currentid, 'circle');
		}
		this.is_drawing   = this.DM_SQUARE_DRAW;
		this.statusMessage(this.strings['SQUARE_DRAW']);
				
		this.areas[this.currentid].style.left = x + 'px';
		this.areas[this.currentid].style.top  = y + 'px';
		if (this.config.bounding_box == true) {
			this.areas[this.currentid].style.borderWidth = '1px';
			this.areas[this.currentid].style.borderStyle = 'dotted';
			this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
		}
		this.areas[this.currentid].style.width  = 0;
		this.areas[this.currentid].style.height = 0;
	}
	
	this.memory[this.currentid].downx  = x;
	this.memory[this.currentid].downy  = y;
	
}


imgmap.prototype.img_area_mouseover = function(e) {
	if (this.is_drawing) return;//exit if in drawing state
	if (this.viewmode == 1) return;//exit if preview mode
	var obj = (document.all) ? window.event.srcElement : e.currentTarget;
	if (typeof obj.aid == 'undefined') obj = obj.parentNode;
	var id = obj.aid;
	
	if (this.areas[id]) {
		//area exists - highlight it
		if (this.areas[id].shape == 'rectangle') {
			this.areas[id].style.borderWidth = '1px';
			this.areas[id].style.borderStyle = 'solid';
			this.areas[id].style.borderColor = this.config.CL_HIGHLIGHT_SHAPE;
		}
		else if (this.areas[id].shape == 'circle' || this.areas[id].shape == 'polygon') {
			if (this.config.bounding_box == true) {
				this.areas[id].style.borderWidth = '1px';
				this.areas[id].style.borderStyle = 'solid';
				this.areas[id].style.borderColor = this.config.CL_HIGHLIGHT_BOX;
			}
		}
		this._setopacity(this.areas[id], this.config.CL_HIGHLIGHT_BG, this.config.highlight_opacity);
		this._repaint(this.areas[id], this.config.CL_HIGHLIGHT_SHAPE);
	}
}


imgmap.prototype.img_area_mouseout = function(e) {
	if (this.is_drawing) return;//exit if in drawing state
	if (this.viewmode == 1) return;//exit if preview mode
	var obj = (document.all) ? window.event.srcElement : e.currentTarget;
	if (typeof obj.aid == 'undefined') obj = obj.parentNode;
	var id = obj.aid;

	if (this.areas[id]) {
		//area exists - fade it back
		if (this.areas[id].shape == 'rectangle') {
			this.areas[id].style.borderWidth = '1px';
			this.areas[id].style.borderStyle = 'solid';
			this.areas[id].style.borderColor = this.config.CL_NORM_SHAPE;
		}
		else if (this.areas[id].shape == 'circle' || this.areas[id].shape == 'polygon') {
			if (this.config.bounding_box == true) {
				this.areas[id].style.borderWidth = '1px';
				this.areas[id].style.borderStyle = 'solid';
				this.areas[id].style.borderColor = this.config.CL_NORM_BOX;
			}
		}
		this._setopacity(this.areas[id], this.config.CL_NORM_BG, this.config.norm_opacity);
		this._repaint(this.areas[id], this.config.CL_NORM_SHAPE);
	}
}


imgmap.prototype.img_area_click = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	var obj = (document.all) ? window.event.srcElement : e.currentTarget;
	if (typeof obj.aid == 'undefined') obj = obj.parentNode;
	this.form_selectRow(obj.aid, false);
	this.currentid = obj.aid;
}


/**
 *	Handles click on a property row.
 *	id can be the this.props[i] object or i itself.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-06 16:55:29
 */
imgmap.prototype.form_selectRow = function(id, setfocus) {
	if (this.is_drawing) return;//exit if in drawing state
	if (this.viewmode == 1) return;//exit if preview mode
	if (!this.form_container) return;//exit if no form container
	if (!document.getElementById('img_active_'+id)) return;
	document.getElementById('img_active_'+id).checked = 1;
	if (setfocus) document.getElementById('img_active_'+id).focus();
	//remove all background styles
	for (var i = 0; i < this.props.length; i++) {
		if (this.props[i]) {
			this.props[i].style.background = '';
		}
	}
	//put highlight on actual props row
	this.props[id].style.background = this.config.CL_HIGHLIGHT_PROPS;
}


/**
 *	Handles delete keypress on any form row.
 *	@author	adam 
 */
imgmap.prototype.img_area_keydown = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	var key = (window.event) ? event.keyCode : e.keyCode;
	//alert(key);
	if (key == 46) {
		//delete pressed
		this.removeArea();
	}
}


/**
 *	Called when the properties line loses focus, and the recalculate function
 *	must be called.
 *	@date	2006.10.24. 22:42:02
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.img_area_blur = function(e) {
	var obj = (document.all) ? window.event.srcElement : e.currentTarget;
	this._recalculate(obj.parentNode.aid);
	if (this.html_container) this.html_container.value = this.getMapHTML();
}


/**
 *	Called when the grand HTML code loses focus, and the changes must be reflected.
 *	@date	2006.10.24. 22:51:20
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.html_container_blur = function(e) {
	var oldvalue = this.html_container.getAttribute('oldvalue');
	if (oldvalue != this.html_container.value) {
		this.setMapHTML(this.html_container.value);
	}
}


/**
 *	Called when the optional html container gets focus.
 *	We need to memorize its old value in order to be able to
 *	detect changes in the code that needs to be reflected.
 *	@date	20-02-2007 17:51:16
 *	@author Adam Maschek (adam.maschek(at)gmail.com)
 */
imgmap.prototype.html_container_focus = function(e) {
	this.html_container.setAttribute('oldvalue', this.html_container.value);
	this.html_container.select();
}


/**
 *	@url	http://evolt.org/article/Mission_Impossible_mouse_position/17/23335/index.html
 */
imgmap.prototype.area_mousemove = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	if (this.is_drawing == 0) {
		var obj = (document.all) ? window.event.srcElement : e.currentTarget;
		if (obj.tagName == 'image' || obj.tagName == 'group' ||
			obj.tagName == 'shape' || obj.tagName == 'stroke') {
			//do this because of excanvas
			obj = obj.parentNode.parentNode;
		}
		var xdiff = (window.event) ? (window.event.offsetX) : (e.layerX);
		var ydiff = (window.event) ? (window.event.offsetY) : (e.layerY);
		//this.log(obj.aid + ' : ' + xdiff + ',' + ydiff);
		if (xdiff < 10 && ydiff < 10) {
			//move all
			obj.style.cursor = 'move';
		}
		else if (xdiff < 6 && ydiff > 6) {
			//move left
			if (obj.shape != 'polygon') {
				obj.style.cursor = 'w-resize';
			}
		}
		else if (xdiff > parseInt(obj.style.width) - 6  && ydiff > 6) {
			//move right
			if (obj.shape != 'polygon') {
				obj.style.cursor = 'e-resize';
			}
		}
		else if (xdiff > 6 && ydiff < 6) {
			//move top
			if (obj.shape != 'polygon') {
				obj.style.cursor = 'n-resize';
			}
		}
		else if (ydiff > parseInt(obj.style.height) - 6  && xdiff > 6) {
			//move bottom
			if (obj.shape != 'polygon') {
				obj.style.cursor = 's-resize';
			}
		}
		else {
			//default
			obj.style.cursor = 'move';
		}
	}
	else {
		//if drawing and not ie, have to propagate to image event
		this.img_mousemove(e);
	}
}


imgmap.prototype.area_mousedown = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	if (this.is_drawing == 0) {
		var obj = (document.all) ? window.event.srcElement : e.currentTarget;
		//alert(obj.tagName);
		//alert(obj.className);
		//alert(obj.parentNode.tagName);
		//alert(obj.parentNode.parentNode.tagName);
		if (obj.tagName == 'DIV') {
			//do this because of label
			//alert('a')
			obj = obj.parentNode;
		}
		if (obj.tagName == 'image' || obj.tagName == 'group' ||
			obj.tagName == 'shape' || obj.tagName == 'stroke') {
			//do this because of excanvas
			obj = obj.parentNode.parentNode;
		}
		if (this.areas[this.currentid] != obj) {
			//trying to draw on a different canvas,switch to this one
			if (typeof obj.aid == 'undefined') {
				this.log('Cannot identify target area', 1);
				return;
			}
			this.form_selectRow(obj.aid, true);
			this.currentid = obj.aid;
		}
		var xdiff = (window.event) ? (window.event.offsetX) : (e.layerX);
		var ydiff = (window.event) ? (window.event.offsetY) : (e.layerY);
		//this.log(obj.aid + ' : ' + xdiff + ',' + ydiff);
		if (xdiff < 6 && ydiff > 6) {
			//move left
			if (this.areas[this.currentid].shape == 'circle') {
				this.is_drawing   = this.DM_SQUARE_RESIZE_LEFT;
				this.statusMessage(this.strings['SQUARE_RESIZE_LEFT']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
			}
			else if (this.areas[this.currentid].shape == 'rectangle') {
				this.is_drawing   = this.DM_RECTANGLE_RESIZE_LEFT;
				this.statusMessage(this.strings['RECTANGLE_RESIZE_LEFT']);
				this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
			}
		}
		else if (xdiff > parseInt(this.areas[this.currentid].style.width) - 6  && ydiff > 6) {
			//move right
			if (this.areas[this.currentid].shape == 'circle') {
				this.is_drawing   = this.DM_SQUARE_RESIZE_RIGHT;
				this.statusMessage(this.strings['SQUARE_RESIZE_RIGHT']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
			}
			else if (this.areas[this.currentid].shape == 'rectangle') {
				this.is_drawing   = this.DM_RECTANGLE_RESIZE_RIGHT;
				this.statusMessage(this.strings['RECTANGLE_RESIZE_RIGHT']);
				this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
			}
		}
		else if (xdiff > 6 && ydiff < 6) {
			//move top
			if (this.areas[this.currentid].shape == 'circle') {
				this.is_drawing   = this.DM_SQUARE_RESIZE_TOP;
				this.statusMessage(this.strings['SQUARE_RESIZE_TOP']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
			}
			else if (this.areas[this.currentid].shape == 'rectangle') {
				this.is_drawing   = this.DM_RECTANGLE_RESIZE_TOP;
				this.statusMessage(this.strings['RECTANGLE_RESIZE_TOP']);
				this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
			}
		}
		else if (ydiff > parseInt(this.areas[this.currentid].style.height) - 6  && xdiff > 6) {
			//move bottom
			if (this.areas[this.currentid].shape == 'circle') {
				this.is_drawing   = this.DM_SQUARE_RESIZE_BOTTOM;
				this.statusMessage(this.strings['SQUARE_RESIZE_BOTTOM']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
			}
			else if (this.areas[this.currentid].shape == 'rectangle') {
				this.is_drawing   = this.DM_RECTANGLE_RESIZE_BOTTOM;
				this.statusMessage(this.strings['RECTANGLE_RESIZE_BOTTOM']);
				this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
			}
		}
		else/*if (xdiff < 10 && ydiff < 10 ) */{
			//move all
			if (this.areas[this.currentid].shape == 'circle') {
				this.is_drawing   = this.DM_SQUARE_MOVE;
				this.statusMessage(this.strings['SQUARE_MOVE']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
				this.memory[this.currentid].rdownx = xdiff;
				this.memory[this.currentid].rdowny = ydiff;
			}
			else if (this.areas[this.currentid].shape == 'rectangle') {
				this.is_drawing   = this.DM_RECTANGLE_MOVE;
				this.statusMessage(this.strings['RECTANGLE_MOVE']);
				this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_SHAPE;
				this.memory[this.currentid].rdownx = xdiff;
				this.memory[this.currentid].rdowny = ydiff;
			}
			else if (this.areas[this.currentid].shape == 'polygon') {
				for (var i=0; i<this.areas[this.currentid].xpoints.length; i++) {
					this.memory[this.currentid].xpoints[i] = this.areas[this.currentid].xpoints[i];
					this.memory[this.currentid].ypoints[i] = this.areas[this.currentid].ypoints[i];
				}
				this.is_drawing   = this.DM_POLYGON_MOVE;
				this.statusMessage(this.strings['POLYGON_MOVE']);
				if (this.config.bounding_box == true) this.areas[this.currentid].style.borderColor = this.config.CL_DRAW_BOX;
				this.memory[this.currentid].rdownx = xdiff;
				this.memory[this.currentid].rdowny = ydiff;
			}
		}
		
		//common memory settings (preparing to move or resize)
		this.memory[this.currentid].width  = parseInt(this.areas[this.currentid].style.width);
		this.memory[this.currentid].height = parseInt(this.areas[this.currentid].style.height);
		this.memory[this.currentid].top    = parseInt(this.areas[this.currentid].style.top);
		this.memory[this.currentid].left   = parseInt(this.areas[this.currentid].style.left);
		if (this.areas[this.currentid].shape == 'rectangle') {
			this.areas[this.currentid].style.borderWidth = '1px';
			this.areas[this.currentid].style.borderStyle = 'dotted';
		}
		else if (this.areas[this.currentid].shape == 'circle' || this.areas[this.currentid].shape == 'polygon') {
			if (this.config.bounding_box == true) {
				this.areas[this.currentid].style.borderWidth = '1px';
				this.areas[this.currentid].style.borderStyle = 'dotted';
			}
		}
		this._setopacity(this.areas[this.currentid], this.config.CL_DRAW_BG, this.config.draw_opacity);
	}
	else {
		//if drawing and not ie, have to propagate to image event
		this.img_mousedown(e);
	}
}


/**
 *	@author	Diego Perlini
 *	@url	http://javascript.nwbox.com/cursor_position/
 */
imgmap.prototype.getSelectionStart = function(obj) {
	if (obj.createTextRange) {
		var r = document.selection.createRange().duplicate()
		r.moveEnd('character', obj.value.length)
		if (r.text == '') return obj.value.length
		return obj.value.lastIndexOf(r.text)
	} else return obj.selectionStart;
}


imgmap.prototype.setSelectionRange = function(obj, start, end) {
	if (typeof end == "undefined") end = start;
	if (obj.selectionStart) {
		obj.setSelectionRange(start, end);
		obj.focus(); // to make behaviour consistent with IE
	}
	else if (document.selection) {
		var range = obj.createTextRange();
		range.collapse(true);
		range.moveStart("character", start);
		range.moveEnd("character", end - start);
		range.select();
	}
}


/**
 *	Handles arrow keys on img_coords input field.
 *	Changes the coordinate values by +/- 1 and updates the corresponding canvas area.
 *	@author	adam
 *	@date	25-09-2007 17:12:43
 */
imgmap.prototype.img_coords_keydown = function(e) {
	if (this.viewmode == 1) return;//exit if preview mode
	var key = (window.event) ? event.keyCode : e.keyCode;
	var obj = (document.all) ? window.event.srcElement : e.originalTarget;
	//console.log(key);
	//console.log(obj);
	if (key == 40 || key == 38) {
		//down or up pressed
		//get the coords
		var coords = obj.value;
		//this.log(obj.value);
		coords = coords.split(',');
		var s = this.getSelectionStart(obj);
		var j = 0;
		for (var i=0; i<coords.length; i++) {
			j+=coords[i].length;
			if (j > s) {
				//this is the coord we want
				if (key == 40 && coords[i] > 0) coords[i]--;
				if (key == 38) coords[i]++;
				this._recalculate(this.currentid);
				break;
			}
			//jump one more because of comma
			j++;
		}
		obj.value = coords.join(',');
		//set cursor back to its original position
		this.setSelectionRange(obj, s);
		return true;
	}
}


/**
 *	Handles SHIFT hold while drawing.
 *	@author	adam
 */
imgmap.prototype.doc_keydown = function(e) {
	var key = (window.event) ? event.keyCode : e.keyCode;
	//console.log(key);
	if (key == 16) {
		//shift key pressed
		if (this.is_drawing == this.DM_POLYGON_DRAW) {
			this.is_drawing = this.DM_POLYGON_LASTDRAW;
		}
		else if (this.is_drawing == this.DM_RECTANGLE_DRAW) {
			this.is_drawing   = this.DM_SQUARE_DRAW;
			this.statusMessage(this.strings['SQUARE2_DRAW']);
		}
	}
}


/**
 *	Handles SHIFT release while drawing.
 *	@author	adam
 */
imgmap.prototype.doc_keyup = function(e) {
	var key = (window.event) ? event.keyCode : e.keyCode;
	//alert(key);
	if (key == 16) {
		//shift key released
		if (this.is_drawing == this.DM_POLYGON_LASTDRAW) {
			this.is_drawing = this.DM_POLYGON_DRAW;
		}
		else if (this.is_drawing == this.DM_SQUARE_DRAW && this.areas[this.currentid].shape == 'rectangle') {
			//not for circle!
			this.is_drawing   = this.DM_RECTANGLE_DRAW;
			this.statusMessage(this.strings['RECTANGLE_DRAW']);
		}
	}
}


imgmap.prototype._getPos = function(element) {
	var xpos = 0;
	var ypos = 0;
	if (element) {
		var elementOffsetParent = element.offsetParent;
		// If the element has an offset parent
		if (elementOffsetParent) {
			// While there is an offset parent
			while ((elementOffsetParent = element.offsetParent) != null) {
				xpos += element.offsetLeft;
				ypos += element.offsetTop;
				element = elementOffsetParent;
			}
		}
		else {
			xpos = element.offsetLeft;
			ypos = element.offsetTop;
		}
	}
	return new Object({x: xpos, y: ypos});
}


/**
 *	Determines if given area is the last (visible and editable) area.
 *	@author	Adam Maschek (adam.maschek(at)gmail.com)
 *	@date	2006-06-15 16:34:51
 */
imgmap.prototype._getLastArea = function() {
	for (var i = this.areas.length-1; i>=0; i--) {
		if (this.areas[i]) return this.areas[i];
	}
	return null;
}


/**
 *	Tries to copy imagemap html or text parameter to the clipboard.
 *	@date	2006.10.24. 22:14:12
 */
imgmap.prototype.toClipBoard = function(text) {
	if (typeof text == 'undefined') text = this.getMapHTML();
	//alert(typeof window.clipboardData);
	try {
		if (window.clipboardData) {
			// IE send-to-clipboard method.
			window.clipboardData.setData('Text', text);
		}
		else if (window.netscape) {
			// You have to sign the code to enable this or allow the action in
			// about:config by changing user_pref("signed.applets.codebase_principal_support", true);
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
			
			// Store support string in an object.
			var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
			if (!str) return false;
			str.data = text;
			
			// Make transferable.
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
			if (!trans) return false;
			
			// Specify what datatypes we want to obtain, which is text in this case.
			trans.addDataFlavor("text/unicode");
			trans.setTransferData("text/unicode", str, text.length*2);
			
			var clipid = Components.interfaces.nsIClipboard;
			var clip   = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
			if (!clip) return false;
	
			clip.setData(trans, null, clipid.kGlobalClipboard);
		}
	}
	catch (err) {
		this.log("Unable to set clipboard data", 1);
	}
}


/**
 *	Parses cssText to single style declarations.
 *	@author	adam
 *	@date	25-09-2007 18:19:51
 */
imgmap.prototype.assignCSS = function(obj, cssText) {
	var parts = cssText.split(';');
	for (var i=0; i<parts.length; i++) {
		var p = parts[i].split(':');
		//we need to camelcase by - signs
		var pp = p[0].trim().split('-');
		var prop = pp[0];
		for (var j=1; j<pp.length; j++) {
			//replace first letters to uppercase
			prop+= pp[j].replace(/^./, pp[j].substring(0,1).toUpperCase());
		}
		prop = prop.trim();
		value = p[1].trim();
		//alert('obj.style.' + prop + ' = \'' + value + '\';');
		//eval is evil, but we have no other choice
		eval('obj.style.' + prop + ' = \'' + value + '\';');
	}
}


/**
 *	@date	11-02-2007 19:57:05
 *	@url	http://www.deepwood.net/writing/method-references.html.utf8
 *	@author	Daniel Brockman
 */
Function.prototype.bind = function(object) {
	var method = this;
	return function () {
		return method.apply(object, arguments);
	}
}


/**
 *	Trim functions.
 *	@url	http://www.somacon.com/p355.php 
 */
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

function imgmap_spawnObjects(config) {
	//console.log('spawnobjects');
	var maps = document.getElementsByTagName('map');
	var imgs = document.getElementsByTagName('img');
	var imaps = new Array();
	//console.log(maps.length);
	for (var i=0; i<maps.length; i++) {
		for (var j=0; j<imgs.length; j++) {
		//console.log(i);
		//	console.log(maps[i].name);
		//	console.log(imgs[j].getAttribute('usemap'));
			if ('#' + maps[i].name == imgs[j].getAttribute('usemap')) {
				//we found one matching pair
			//	console.log(maps[i]);
				config.mode = '';
				imapn = new imgmap(config);
				//imapn.setup(config);
				imapn.useImage(imgs[j]);
				imapn.setMapHTML(maps[i]);
				imapn.viewmode = 1;
				
				imaps.push(imapn);
				
			}
		}
	}
}

//global instance?
//imgmap_spawnObjects();?
