import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
import { tags, tag_map } from "../../../tags.js";

const extensionName = "tag-card-grouper";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = { enabled: true };

function getTagNamesForCharacter(character) {
    const key = character.avatar;
    const tagIds = tag_map[key] || [];
    return tagIds.map(id => {
        const t = tags.find(t => t.id === id);
        return t ? t.name.toLowerCase() : null;
    }).filter(Boolean);
}

function groupAndRenderCards() {
    const debug = $("#tcg_debug");

    if (!extension_settings[extensionName]?.enabled) {
        debug.text("❌ Extension désactivée");
        return;
    }

    const context = getContext();
    const characters = context.characters;
    if (!characters || !characters.length) {
        debug.text("❌ Aucun personnage trouvé");
        return;
    }

    const characterList = $("#character_list");
    if (!characterList.length) {
        debug.text("❌ #character_list introuvable");
        return;
    }

    const cards = characterList.find(".character_select");
    if (!cards.length) {
        debug.text("❌ Aucune card trouvée dans #character_list");
        return;
    }

    debug.text(`✅ ${characters.length} persos, ${cards.length} cards trouvées`);

    $(".tcg-group-header").remove();

    const groups = { male: [], female: [], others: {}, untagged: [] };

    cards.each(function () {
        const chid = parseInt($(this).attr("chid"));
        if (isNaN(chid)) return;
        const character = characters[chid];
        if (!character) return;
        const tagNames = getTagNamesForCharacter(character);

        if (tagNames.includes("male")) {
            groups.male.push(this);
        } else if (tagNames.includes("female")) {
            groups.female.push(this);
        } else if (tagNames.length > 0) {
            const primaryTag = tagNames[0];
            if (!groups.others[primaryTag]) groups.others[primaryTag] = [];
            groups.others[primaryTag].push(this);
        } else {
            groups.untagged.push(this);
        }
    });

    cards.detach();

    function appendGroup(label, items) {
        if (!items.length) return;
        const header = $(`<div class="tcg-group-header"><span>${label}</span><small>${items.length}</small></div>`);
        characterList.append(header);
        items.forEach(card => characterList.append(card));
    }

    appendGroup("♂ Male", groups.male);
    appendGroup("♀ Female", groups.female);
    Object.keys(groups.others).sort().forEach(tag => appendGroup(`🏷 ${tag}`, groups.others[tag]));
    appendGroup("📌 Untagged", groups.untagged);

    debug.text(`✅ Groupé ! M:${groups.male.length} F:${groups.female.length} Autres:${Object.keys(groups.others).length} Sans tag:${groups.untagged.length}`);
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);

        extension_settings[extensionName] = extension_settings[extensionName] || {};
        if (Object.keys(extension_settings[extensionName]).length === 0) {
            Object.assign(extension_settings[extensionName], defaultSettings);
        }

        $("#tcg_enabled").prop("checked", extension_settings[extensionName].enabled);

        $("#tcg_enabled").on("input", function () {
            extension_settings[extensionName].enabled = Boolean($(this).prop("checked"));
            saveSettingsDebounced();
            groupAndRenderCards();
        });

        $("#tcg_apply_button").on("click", groupAndRenderCards);

        eventSource.on(event_types.CHARACTER_LIST_UPDATED, groupAndRenderCards);

        setTimeout(groupAndRenderCards, 1000);

        console.log(`[${extensionName}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
