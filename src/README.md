# learningFront — фронтенд (Feature-Sliced Design)

Клиент Praxis (Expo/React Native). Организован по **FSD**. Полное описание архитектуры и маппинга Praxis→FSD — в [docs/architecture/04-frontend-fsd.md](../../docs/architecture/04-frontend-fsd.md).

## Слои (импорт строго вниз)

| Слой        | Роль                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| `app/`      | Инициализация, провайдеры, роуты expo-router, **регистрация модулей** (`app/modules/*`)  |
| `pages/`    | Экраны                                                                                   |
| `widgets/`  | Составные блоки (`ActivityDispatcher`, `TodayQueue`)                                     |
| `features/` | Взаимодействия по типам Activity (`vocab-review`, `ielts-writing`, …)                    |
| `entities/` | Бизнес-сущности (`activity`, `srs-card`, `response`, `module`)                           |
| `shared/`   | Переиспользуемое: **`engine/`** (доменно-независимое ядро), `ui`, `api`, `config`, `lib` |

## Ядро (`shared/engine`)

Доменно-независимое ядро (Activity, реестр модулей, FSRS, порты). **Инвариант №3:** не импортирует ничего из верхних слоёв и не содержит доменных строк. Публичный API — только через `@/shared/engine`.

Алиас `@/*` → `src/*`.
