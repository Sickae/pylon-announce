const cmds = new discord.command.CommandGroup({
    defaultPrefix: '!'
  });
  const announceKv = new pylon.KVNamespace('announce');
  
  const CRON_SAMPLER_URL: string = 'http://www.cronmaker.com/rest/sampler';
  
  const EMBED_CFG = {
    NAME: 'Back2Basics',
    ICON_URL:
      'https://cdn.discordapp.com/icons/288270613531852800/88ddeb84793f9060f443fbf3fd753089.png?size=128'
  };
  
  const COLORS: DiscordColors = {
    DEFAULT: 0,
    AQUA: 1752220,
    DARK_AQUA: 1146986,
    GREEN: 3066993,
    DARK_GREEN: 2067276,
    BLUE: 3447003,
    PURPLE: 10181046,
    DARK_BLUE: 2123412,
    DARK_PURPLE: 7419530,
    LUMINOUS_VIVID_PINK: 15277667,
    DARK_VIVID_PINK: 11342935,
    GOLD: 15844367,
    DARK_GOLD: 12745742,
    ORANGE: 15105570,
    DARK_ORANGE: 11027200,
    RED: 15158332,
    DARK_RED: 10038562,
    GREY: 9807270,
    DARK_GREY: 9936031,
    DARKER_GREY: 8359053,
    LIGHT_GREY: 12370112,
    NAVY: 3426654,
    DARK_NAVY: 2899536,
    YELLOW: 16776960
  };
  
  const MSG = {
    ERROR: {
      NAME_ALREADY_EXISTS: "There's an announcement with this name already.",
      INVALID_ARGUMENT: 'Invalid argument.',
      ANNOUNCE_DOESNT_EXIST: "Announcement doesn't exist.",
      INVALID_CRON: 'Invalid cron expression.',
      INVALID_TEXT_CHANNEL: 'Invalid text channel.',
      INVALID_ANNOUNCE_JSON: 'Invalid JSON.',
      INVALID_COLOR_CODE:
        'Invalid color code.\nAvailable colors:\n' +
        '`' +
        Object.keys(COLORS).join(', ') +
        '`',
      INVALID_NEXT_FIRE: "Next fire date isn't set.",
      UNEXPECTED_ERROR: 'Unexpected error.'
    },
    SUCCESS: {
      ANNOUNCE_CREATED: 'Announcement successfully created.',
      ANNOUNCE_EDITED: 'Announcement successfully edited.',
      ANNOUNCE_DELETED: 'Announcement successfully deleted.'
    },
    INFO: {
      EMPTY_LIST: 'The list is empty.'
    }
  };
  
  interface DiscordColors {
    [index: string]: number;
  }
  
  interface Announce {
    name: string;
    authorId: discord.Snowflake;
    channelId: discord.Snowflake;
    cron: string;
    title: string;
    description?: string;
    color?: number;
    nextFire?: number;
  }
  
  cmds.subcommand('anc', (subcommand) => {
    subcommand.on(
      'new',
      (ctx) => ({
        name: ctx.string(),
        channel: ctx.guildTextChannel(),
        cron: ctx.text()
      }),
      async (msg, { name, channel, cron }) => {
        let exists = await announceKv.get(name);
        if (exists) {
          return await msg.reply(MSG.ERROR.NAME_ALREADY_EXISTS);
        }
  
        if (!(await isCronValid(cron))) {
          return await msg.reply(MSG.ERROR.INVALID_CRON);
        }
  
        let announce: Announce = {
          name,
          authorId: msg.author.id,
          channelId: channel.id,
          cron,
          title: name
        };
  
        await createAnnounce(announce);
        return await msg.reply(MSG.SUCCESS.ANNOUNCE_CREATED);
      }
    );
  
    subcommand.on(
      'edit',
      (ctx) => ({
        name: ctx.string(),
        type: ctx.string({
          choices: ['title', 'desc', 'description', 'channel', 'cron', 'color']
        }),
        content: ctx.text()
      }),
      async (msg, { name, type, content }) => {
        if (!(await announceKv.get<string>(name))) {
          return await msg.reply(MSG.ERROR.ANNOUNCE_DOESNT_EXIST);
        }
  
        if (type === 'title') {
          await editAnnounce(
            name,
            content,
            undefined,
            undefined,
            undefined,
            undefined
          );
        } else if (type === 'desc' || type === 'description') {
          await editAnnounce(
            name,
            undefined,
            content,
            undefined,
            undefined,
            undefined
          );
        } else if (type === 'channel') {
          let snowflakeRegex = new RegExp('<#(\\d+)>');
          let trimmedChannelId = content.replace(snowflakeRegex, '$1');
          if (
            !snowflakeRegex.test(trimmedChannelId) ||
            !(await discord.getTextChannel(trimmedChannelId))
          ) {
            return await msg.reply(MSG.ERROR.INVALID_TEXT_CHANNEL);
          }
          await editAnnounce(
            name,
            undefined,
            undefined,
            trimmedChannelId,
            undefined,
            undefined
          );
        } else if (type === 'cron') {
          if (!(await isCronValid(content))) {
            return await msg.reply(MSG.ERROR.INVALID_CRON);
          }
          await editAnnounce(
            name,
            undefined,
            undefined,
            undefined,
            content,
            undefined
          );
        } else if (type === 'color') {
          content = content.toUpperCase();
          if (COLORS[content] === undefined) {
            return await msg.reply(MSG.ERROR.INVALID_COLOR_CODE);
          }
          await editAnnounce(
            name,
            undefined,
            undefined,
            undefined,
            undefined,
            COLORS[content]
          );
        } else {
          return await msg.reply(MSG.ERROR.INVALID_ARGUMENT);
        }
  
        return await msg.reply(MSG.SUCCESS.ANNOUNCE_EDITED);
      }
    );
  
    subcommand.on(
      'delete',
      (ctx) => ({
        name: ctx.string()
      }),
      async (msg, { name }) => {
        if (!(await announceKv.get<string>(name))) {
          return await msg.reply(MSG.ERROR.ANNOUNCE_DOESNT_EXIST);
        }
  
        await announceKv.delete(name);
        return await msg.reply(MSG.SUCCESS.ANNOUNCE_DELETED);
      }
    );
  
    subcommand.on(
      'post',
      (ctx) => ({
        name: ctx.string(),
        channel: ctx.guildTextChannelOptional()
      }),
      async (msg, { name, channel }) => {
        if (!(await announceKv.get<string>(name))) {
          return await msg.reply(MSG.ERROR.ANNOUNCE_DOESNT_EXIST);
        }
  
        await postAnnounce(name, channel?.id ?? undefined);
      }
    );
  
    subcommand.on(
      'get',
      (ctx) => ({
        name: ctx.string()
      }),
      async (msg, { name }) => {
        let announce = await getAnnounce(name);
        if (!announce) {
          return await msg.reply(MSG.ERROR.ANNOUNCE_DOESNT_EXIST);
        }
        await msg.reply(
          '```json\n' + JSON.stringify(announce, null, 4) + '\n```'
        );
      }
    );
  
    subcommand.on(
      'import',
      (ctx) => ({
        json: ctx.text()
      }),
      async (msg, { json }) => {
        let anc: Announce;
        try {
          anc = JSON.parse(json);
        } catch (e) {
          if (e instanceof SyntaxError) {
            return await msg.reply(MSG.ERROR.INVALID_ANNOUNCE_JSON);
          } else {
            return await msg.reply(MSG.ERROR.UNEXPECTED_ERROR);
          }
        }
  
        let exists = await announceKv.get(anc.name);
        if (exists) {
          return await msg.reply(MSG.ERROR.NAME_ALREADY_EXISTS);
        }
  
        await createAnnounce(anc);
        await msg.reply(MSG.SUCCESS.ANNOUNCE_CREATED);
      }
    );
  
    subcommand.raw('list', async (msg) => {
      let items = await announceKv.list();
      if (items.length === 0) {
        return await msg.reply(MSG.INFO.EMPTY_LIST);
      }
  
      await msg.reply(items.join('\n'));
    });
  
    subcommand.on(
      'next',
      (ctx) => ({
        name: ctx.string()
      }),
      async (msg, { name }) => {
        let announce = await getAnnounce(name);
        if (!announce) {
          return await msg.reply(MSG.ERROR.ANNOUNCE_DOESNT_EXIST);
        }
  
        if (announce.nextFire)
          await msg.reply(new Date(announce.nextFire).toISOString());
        else await msg.reply(MSG.ERROR.INVALID_NEXT_FIRE);
      }
    );
  });
  
  async function createAnnounce(announce: Announce) {
    await announceKv.put(announce.name, JSON.stringify(announce));
    await updateNextFire(announce.name);
  }
  
  async function getAnnounce(name: string): Promise<Announce | null> {
    let announceJson = await announceKv.get<string>(name);
    if (!announceJson) return null;
    return JSON.parse(announceJson);
  }
  
  async function editAnnounce(
    name: string,
    title?: string,
    description?: string,
    channelId?: discord.Snowflake,
    cron?: string,
    color?: number
  ): Promise<void> {
    if (await announceKv.get(name)) {
      await announceKv.transact(name, (x) => {
        let anc: Announce = JSON.parse(x as string);
  
        if (title !== undefined) anc.title = title;
        if (description !== undefined) anc.description = description ?? undefined;
        if (channelId !== undefined) anc.channelId = channelId;
        if (cron !== undefined) {
          anc.cron = cron;
          setTimeout(async () => await updateNextFire(name), 1000);
        }
        if (color !== undefined) anc.color = color;
  
        return JSON.stringify(anc);
      });
    }
  }
  
  async function updateNextFire(name: string) {
    let announce = await getAnnounce(name);
    if (announce) {
      let nextDates = await getNextDates(announce.cron);
      if (nextDates) {
        announceKv.transact(name, (x) => {
          let anc: Announce = JSON.parse(x as string);
          anc.nextFire = +(nextDates as Date[])[0];
          return JSON.stringify(anc);
        });
      }
    }
  }
  
  async function isCronValid(cron: string): Promise<boolean> {
    let url = generateCronSamplerUrl(cron);
    let response = await fetch(url);
  
    return response.status === 200;
  }
  
  async function postAnnounce(
    name: string,
    channelId?: discord.Snowflake
  ): Promise<void> {
    let announce = await getAnnounce(name);
    if (announce) {
      let channel = await discord.getTextChannel(channelId ?? announce.channelId);
      if (channel) {
        await channel.sendMessage(await createAnnounceEmbedMessage(announce));
      }
    }
  }
  
  async function createAnnounceEmbedMessage(
    announce: Announce
  ): Promise<
    discord.Message.OutgoingMessageArgument<
      discord.Message.OutgoingMessageOptions
    >
  > {
    let embed = new discord.Embed({
      author: {
        name: EMBED_CFG.NAME,
        iconUrl: EMBED_CFG.ICON_URL
      },
      title: announce.title,
      description: announce.description,
      color: announce.color || COLORS.DEFAULT
    });
  
    return { embed };
  }
  
  pylon.tasks.cron('announce', '0 0/5 * * * * *', async () => {
    await checkAnnounces();
  });
  
  async function checkAnnounces() {
    let keys = await announceKv.list();
    if (keys.length === 0) {
      return;
    }
  
    for (let key of keys) {
      let anc = (await getAnnounce(key)) as Announce;
      let checkDate = new Date();
      checkDate.setMinutes(checkDate.getMinutes() + 5);
      let now = Date.now();
  
      if (anc.nextFire && anc.nextFire <= now) {
        await postAnnounce(anc.name);
      }
      await updateNextFire(anc.name);
    }
  }
  
  function generateCronSamplerUrl(cron: string): URL {
    let url = new URL(CRON_SAMPLER_URL);
    url.searchParams.append('expression', cron);
    return url;
  }
  
  async function getNextDates(cron: string): Promise<Date[] | null> {
    let response = await fetch(generateCronSamplerUrl(cron));
    if (response.status !== 200) {
      return null;
    }
  
    let dateTexts = (await response.text()).split(',');
    return dateTexts.map((x) => new Date(x));
  }
  