const locales = {
    "@metadata": {
        "authors": [
            "Ian Baker"
        ],
        "last-updated": "2020-03-23",
        "locale": "en",
        "message-documentation": "qqq",
    },
    "en": {
        "ftm-map-of-sites": "Map of donation sites",
        "ftm-list-of-sites": "List of donation sites",
        "ftm-add-site": "To add a donation site, update information, or request we take down information, please",
        "ftm-request-update": "To add a donation site, update information, or request we take down information, please",
        "ftm-fill-in-this-form": "fill in this form",
        "ftm-filters": "Filters",
        "ftm-made-with-love": "Made with &lt;3 in Seattle by ",
        "ftm-item-n95s": "N95 masks/respirators",
        "ftm-item-masks": "surgical masks",
        "ftm-item-face-shields": "face shields",
        "ftm-item-booties": "medical booties",
        "ftm-item-goggles": "safety goggles",
        "ftm-item-gloves": "gloves",
        "ftm-item-kleenex": "kleenex",
        "ftm-item-sanitizer": "hand sanitizer",
        "ftm-item-overalls": "medical overalls",
        "ftm-item-gowns": "gowns",
        "ftm-item-respirators": "advanced respirators (PAPR/CAPR/etc.)",
        "ftm-accepted-items": "Accepted Items",
        "ftm-address": "Address",
        "ftm-instructions": "Instructions",
        "ftm-accepting": "Accepting",
        "ftm-open-packages": "Open packages?",
        "ftm-states": "States",
        "ftm-accepts-open-boxes": "Accepts Open Boxes/bags",

        // These strings are the header titles from data.json.
        // They must match exactly or the app will break.
        "ftm-sheet-hospital-name": "What is the name of the hospital or clinic?",
        "ftm-sheet-address": "Street address for dropoffs?",
        "ftm-sheet-instructions": "Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:",
        "ftm-sheet-accepting": "What are they accepting?",
        "ftm-sheet-open-boxes": "Will they accept open boxes/bags?",
    },
}

$(window).on('load', function() {
  // these need to be loaded after the rest of jq-i18n
  $.getScript("https://cdnjs.cloudflare.com/ajax/libs/jquery.i18n/1.0.7/jquery.i18n.emitter.bidi.min.js");
  $.getScript("https://cdnjs.cloudflare.com/ajax/libs/jquery.i18n/1.0.7/jquery.i18n.emitter.min.js");
  $.i18n().load( locales );

  // translate static elements
  $('.i18n').i18n();
});
