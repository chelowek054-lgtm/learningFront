// Оболочка HTML для веба (Expo Router). Только web: на нативе не используется.
//
// Заведена ради значка: по /favicon.ico dev-сервер отдавал иконку Expo, а
// web.favicon из app.json применяется лишь при экспорте — поэтому наш значок
// лежит в public/ и подключается здесь явно.
//
// <title> здесь НЕ ставим: его пишет expo-router из options.title экранов, и
// два тега <title> в документе спорили бы между собой.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="icon" href="/favicon.ico" />
        {/* Сбрасывает прокрутку body: иначе на вебе скроллится вся страница. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
