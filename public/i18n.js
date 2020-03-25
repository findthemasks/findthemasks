const locales = {
    "@metadata": {
        "authors": [
            "Ian Baker"
        ],
        "last-updated": "2020-03-23",
        "locale": "en",
        "message-documentation": "qqq",
    },
    "qqq": {
        "ftm-map-of-sites": "Title text for the map of donation sites",
        "ftm-list-of-sites": "Title text for the list of donation sites",
        "ftm-request-update": "Link text inviting the user to add a new site for ppe donation",
        "ftm-fill-in-this-form": "Link action text for a form that the user can fill in`",
        "ftm-filters": "Heading for the filters control",
        "ftm-made-with-love": "Tagline explaining where the app was made",
        "ftm-item-n95s": "Button text for N95 masks/respirators",
        "ftm-item-masks": "Button text for surgical masks",
        "ftm-item-face-shields": "Button text for face shields",
        "ftm-item-booties": "Button text for medical booties",
        "ftm-item-goggles": "Button text for safety goggles",
        "ftm-item-gloves": "Button text for gloves",
        "ftm-item-kleenex": "Button text for kleenex",
        "ftm-item-sanitizer": "Button text for hand sanitizer",
        "ftm-item-overalls": "Button text for medical overalls",
        "ftm-item-gowns": "Button text for gowns",
        "ftm-item-respirators": "Button text for advanced respirators (PAPR/CAPR/etc.)",
        "ftm-accepted-items": "Heading for the filter control for which items a hospital will accept",
        "ftm-address": "Heading for the hospital address",
        "ftm-instructions": "Heading for mailing or drop-off instructions",
        "ftm-accepting": "Heading for which items a given hospital will accept",
        "ftm-open-packages": "Heading for whether the hospital accepts open packages",
        "ftm-states": "Heading for US states",
        "ftm-accepts-open-boxes": "Long heading for whether the hospital accepts Open Boxes/bags",
    },
    "en": {
        "ftm-map-of-sites": "Map of donation sites",
        "ftm-list-of-sites": "List of donation sites",
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
    },
}

$(function() {
  $.i18n().load( locales );

  // translate static elements
  $('.i18n').i18n();
});
