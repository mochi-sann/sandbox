import { ActionIcon, Button, Stack, TextInput } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons';
import { Icon } from '@iconify/react';
import send16Filled from '@iconify/icons-fluent/send-16-filled';
import React, { useState } from 'react';

export type InputBarProps = {};

export const InputBar: React.FC<InputBarProps> = (props) => {
  const [value, setValue] = useState("I've just used a hotkey to send a message");
  const handleSubmit = () =>
    showNotification({ title: '送信内容', color: 'green', message: value });
  const handleSave = () => showNotification({ title: '保存したよ', color: 'teal', message: value });

  return (
    <Stack sx={{ flexDirection: 'row', gap: '4px' }} align={'center'}>
      <TextInput
        sx={{ width: 'full', flex: 1 }}
        placeholder="Your message"
        // label="Press ⌘+Enter or Ctrl+Enter when input has focus to send message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={getHotkeyHandler([
          ['mod+Enter', handleSubmit],
          ['mod+S', handleSave],
        ])}
      />
      <ActionIcon size={'lg'} variant="filled" color={'green'} onClick={() => handleSubmit()}>
        <Icon icon={send16Filled} />
      </ActionIcon>
    </Stack>
  );
};
