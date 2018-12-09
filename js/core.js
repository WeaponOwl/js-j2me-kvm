var Kvm = window.Kvm || {};

if (window.jQuery === undefined) jQuery = $ = {};

!function($, window, document)
{
	Kvm.Loader = {
		files: [],
		directories: [],

		loadSuccess: false,
		zipFilesRead: 0,
		zipFiles: [],
		
		readZipFile: function(){
			if(this.zipFilesRead >= this.zipFiles.length) {
				if(this.loadSuccess) this.loadSuccess();
				return;
			}

			writer = new zip.BlobWriter();
			var entry = this.zipFiles[this.zipFilesRead];
			if(entry.directory)
			{
				this.directories[entry.filename] = {
					name: entry.filename
				};
				this.zipFilesRead++;
				this.readZipFile();
			}
			else
			{
				entry.getData(writer, function(blob) {
					Kvm.Loader.files[entry.filename] = {
						name: entry.filename,
						size: entry.uncompressedSize,
						data: blob
					};

					Kvm.Loader.zipFilesRead++;
					Kvm.Loader.readZipFile();
				});
			}
		},

		loadJar: function(base64Blob, loadSuccess)
		{
			this.loadSuccess = loadSuccess;

			zip.useWebWorkers = false;
			zip.createReader(new zip.Data64URIReader(base64Blob), function(zipReader) {
				zipReader.getEntries(function(entries) {
					Kvm.Loader.zipFiles = entries;
					Kvm.Loader.zipFilesRead = 0;
					Kvm.Loader.readZipFile();
				});
			});
		}
	};

	Kvm.Class = function(blob) 
	{ 
		return {
			blob: blob,
			arrayBuffer: false,

			initSuccess: function()
			{
				console.log(this.arrayBuffer);
			},

			init: function()
			{
				var reader = new FileReader();
				var current = this;
				reader.onload = function() {
					current.arrayBuffer = reader.result;
					current.initSuccess();
				};
				reader.readAsArrayBuffer(this.blob);
			}
		};
	};

	Kvm.Core = {
		manifest: {},

		name: false,
		icon: false,
		baseClass: false,

		run: function(base64Blob)
		{
			var parsed = Kvm.Loader.loadJar(base64Blob, function(){ Kvm.Core.loadSuccess(); });
		},

		loadManifest: function(content)
		{
			var lines = content.split("\n");
			for(var i=0;i<lines.length;i++)
			{
				var parts = lines[i].split(":", 2);

				this.manifest[parts[0]] = parts[1].trim();
			}

			var midletInfo = this.manifest['MIDlet-1'].split(', ', 3);
			this.name = midletInfo[0];
			this.icon = midletInfo[1].replace(/^\//g, '');	// remove leading slash in path
			this.baseClass = midletInfo[2];

			var baseClass = new Kvm.Class(Kvm.Loader.files[this.baseClass+'.class'].data);
			baseClass.init();
		},

		loadFile(filename)
		{

		},

		loadSuccess: function() {
			var manifestData = Kvm.Loader.files['META-INF/MANIFEST.MF'].data;

			var reader = new FileReader();
			reader.onload = function() {
				Kvm.Core.loadManifest(reader.result);
			};
			reader.readAsText(manifestData);
		}
	};
}
(window.jQuery, window, document);