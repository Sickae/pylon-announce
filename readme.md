# Announce

Announce is a [Pylon](https://pylon.bot) app for Discord, allowing to configure timed messages called 'Announces' with ease.

# Commands

*  `!anc new <name: string> <channel: guildTextChannel> <cron: text>`
    > Creates a new Announce.
    - **name:** Name of the Announce (you will refer to Announces with this name later)
    - **channel:** The Announce will be posted int he mentioned channel.
    - **cron:** A cron expression that sets the frequency of your post. You can create cron expressions [here](http://www.cronmaker.com).
    > **Example:** `!anc new my-announce #myChannel 0 0 12 1/1 * ? *`

* `!anc edit <name: string> <property: string> <value: text>`
    > Edits various properties of an existing Announce.
    - **name:** Name of the Announce.
    - **property:** The property name you want to edit.
        - **Properties:** `channel, color, cron, desc, description, title`
        - **color:** Sets the embed color. Available options:
        
            `DEFAULT, AQUA, DARK_AQUA, GREEN, DARK_GREEN, BLUE, PURPLE, DARK_BLUE, DARK_PURPLE, LUMINOUS_VIVID_PINK, DARK_VIVID_PINK, GOLD, DARK_GOLD, ORANGE, DARK_ORANGE, RED, DARK_RED, GREY, DARK_GREY, DARKER_GREY, LIGHT_GREY, NAVY, DARK_NAVY, YELLOW`
        - **desc | description:** Sets the description (text body) of the Announce.
        - **title:** Sets the title of the Announce.
    - **value:** The wanted value.
    > **Example:** `!anc edit my-announce title Daily reminder`

* `!anc delete <name: string>`
    - **name:** Name of the Announce.
    > Deletes the named Announce.

* `!anc list`
    > Lists all the Announces.

* `!anc get <name: string>`
    - **name:** Name of the Announce.
    > Shows the named Announce in JSON format.

* `!anc import <json: text>`
    - **name:** The Announce object in JSON format.
    > Imports an Announce in JSON format. Name of the Announce must be unique.

* `!anc next <name: string>`
    - **name:** Name of the Announce.
    > Shows the next fire date for the named Announce.

* `!anc post <name: string> (channel: guildTextChannel)`
    - **name:** Name of the Announce.
    - **channel (optional):** Channel you want the Announce to be posted in.
    > Manually posts the named Announce to the channel mentioned or to the Announce's set channel if not defined.


# Technical limitations

Since [Pylon](https://pylon.bot) limits the frequency of cron tasks to a minimum of 5 minutes, the Announce app inherits this limitation.
For example, if an Announce's next fire date is today 19:38, it will be fired at today 19:40.

# Setting It Up

1. Import the `announce.ts` file inside your `main.ts` file.
    > `import 'announce';`

2. (optional) You can optionally customize the `EMBED_CFG` configuration inside the `announce.ts` file.
    * `ICON_URL`: Icon URL for the embed messages.
