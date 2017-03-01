require([
    "esri/views/MapView",
    "esri/WebMap",
    "esri/Graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/widgets/Search",
    "esri/widgets/Home",
    "esri/widgets/BasemapToggle",
    "esri/widgets/Popup",
    "dojo/on",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/domReady!"
], function (
    MapView, WebMap, Graphic, PictureMarkerSymbol, Search, Home, BasemapToggle, Popup, on, query, domClass, dom
) {
    var webmap = new WebMap({
        portalItem: { // autocasts as new PortalItem()
            id: "7eca81856e22478da183da6a33c24dfe"
        }
    });
    var view = new MapView({
        map: webmap,
        container: "viewDiv",
        popup: new Popup({
            container: "detailsContainer",
            autoPanEnabled: false,
            dockEnabled: false,
            dockOptions: {
                buttonEnabled: false
            },
            messageEnabled: false
        }),
        padding: {
            left: 300
        }
    });
    // Add the home widget to the View UI
    var home = new Home({
        view: view
    });
    var basemapToggle = new BasemapToggle({
        view: view,
        nextBasemap: "hybrid"
    });
    view.ui.add(home, "top-left");
    view.ui.add(basemapToggle, "top-right");

    view.then(function () {
        updateUI(view);
        view.watch("widthBreakpoint", function () {
            updateUI(view);
        });
        setupPopupBehavor(view);
        view.whenLayerView(webmap.layers.getItemAt(0)).then(function (layerView) {
            // data is loaded enable the buttons
            query(".btn-disabled").removeClass("btn-disabled");
            var parks = layerView;
            var search = new Search({
                view: view,
                container: "searchContainer",
                sources: [{
                    featureLayer: layerView.layer,
                    placeholder: "Enter Park Name",
                    searchFields: ["NAME", "Address"],
                    suggestionTemplate: "{NAME}: {Address}",
                    suggestionsEnabled: true
                }]
            });
            on(query(".btn-white"), "click", function () {
                // handle button press 
                var pressed = (this.getAttribute("aria-pressed") === "true");
                this.setAttribute("aria-pressed", !pressed);
                var type = this.dataset.feature;
                filterTrailheadTypes(type, parks, !pressed);
            });
        });
    });

    function updateUI(view) {
        var breakpoint = view.widthBreakpoint;
        if (breakpoint === "xsmall" || breakpoint === "small") {
            domClass.add("sidebar", "bottom-panel");
            view.padding = {
                left: 0,
                bottom: 300
            };
        } else {
            domClass.remove("sidebar", "bottom-panel");
            view.padding = {
                left: 300,
                bottom: 0
            };
        }
    }

    function filterTrailheadTypes(type, layerView, enabled) {
        var types = {
            "ada": "ADATrail != 'Not Recommended'",
            "horse": "HorseTrail != 'Not Recommended'",
            "bikes": "BikeTrail = 'Yes'",
            "picnic": "PICNIC = 'Yes'",
            "pets": "TH_LEASH = 'Yes'"
        };

        if (types[type] && enabled) {
            types[type];
            if (layerView.layer.definitionExpression === null) {
                layerView.layer.definitionExpression = types[type];
            } else {
                layerView.layer.definitionExpression += " AND " + types[type];
            }
        } else {
            layerView.layer.definitionExpression = null;
        }
        layerView.queryFeatureCount().then(function (count) {
            var selected = [];
            query("[aria-pressed=true]").forEach(function (node) {
                selected.push(node.title);
            });
            dom.byId("results").innerHTML = selected.length === 0 ? "" : count + " parks have the selected facilities " + selected.join(",");
        });
    }

    function setupPopupBehavor(view) {
        // Add custom action 
        view.popup.actions.push({
            title: "Info",
            id: "details",
            className: "esri-icon-launch-link-external"
        });
        view.popup.on("trigger-action", function () {
            if (event.action.id === "details") {
                window.open(view.popup.selectedFeature.attributes.AKA);
            }
        });
        view.popup.watch("visible", function () {
            if (!view.popup.visible) {
                view.graphics.removeAll();
            }
        });
        // Add selection symbol when popup features clicked 
        var selectedSymbol = new PictureMarkerSymbol({
            url: "http://static.arcgis.com/images/Symbols/Basic1/Blue_1_Tear_Pin2.png",
            size: 9,
            width: 21.75,
            height: 21.75,
            xoffset: 0,
            yoffset: 11.25
        });
        view.popup.watch("selectedFeature", function () {
            view.graphics.removeAll();
            var feature = view.popup.selectedFeature;
            if (feature) {
                var graphic = new Graphic({
                    geometry: feature.geometry,
                    symbol: selectedSymbol
                });
                view.graphics.add(graphic);
            }
        });
    }
});