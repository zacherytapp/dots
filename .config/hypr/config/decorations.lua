-- Look and feel configuration

hl.config({
    general = {
        gaps_in = 3,
        gaps_out = 8,
        border_size = 2,
        extend_border_grab_area = 10,
        resize_on_border = true,
        col = {
            active_border = {
                colors = { GM_GREEN, GM_AQUA },
                angle = 45,
            },
            inactive_border = GM_BG5,
        },
    },
    group = {
        col = {
            border_active = GM_BLUE,
            border_inactive = GM_BG5,
            border_locked_active = GM_ORANGE,
            border_locked_inactive = GM_BG5,
        },
        groupbar = {
            text_color = GM_BG0,                     -- on light active tab
            text_color_inactive = GM_FG1,            -- on dark inactive tab
            text_color_locked_active = GM_BG0,
            text_color_locked_inactive = GM_FG1,
            col = {
                active = GM_BLUE,
                inactive = GM_BG3,
                locked_active = GM_ORANGE,
                locked_inactive = GM_BG3,
            },
        },
    },
    decoration = {
        dim_special = 0.3,
        rounding = 0,
        active_opacity = 0.95,
        inactive_opacity = 0.85,
        fullscreen_opacity = 1,
        blur = {
            size = 5,
            passes = 4,
            special = true,
        },
    },
})
