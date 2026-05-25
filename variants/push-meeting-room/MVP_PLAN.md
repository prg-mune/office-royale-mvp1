# Office Royale - Push Meeting Room MVP

## Concept

大人数が会議室で押し合い、縮む安全エリアから押し出されないように粘るバトルロワイヤル。

## MVP Scope

- 1人 + NPC49人
- 1秒ごとの疑似リアルタイム入力集計
- Push / Brace / Heavy / Dodge
- 会議机・ホワイトボードなどの障害物
- 徐々に縮む安全エリア
- 脱落順位と最終結果

## Architecture Direction

将来の本番化では、クライアントが毎フレーム座標を同期するのではなく、各プレイヤーの行動だけをサーバーへ送る。

```json
{
  "roomId": "room-001",
  "playerId": "p12",
  "turn": 18,
  "action": "push",
  "direction": "right",
  "power": 0.7
}
```

サーバーは一定tickごとに全入力を処理し、確定したゲーム状態だけを配信する。

```json
{
  "turn": 18,
  "alive": 34,
  "safeArea": { "x": 90, "y": 70, "w": 780, "h": 470 },
  "players": [
    { "id": "p1", "x": 120, "y": 210, "alive": true },
    { "id": "p2", "x": 48, "y": 288, "alive": false }
  ]
}
```

## Next Ideas

- ルーム作成・参加コード
- プレイヤー名入力
- 観戦ビュー
- 特殊イベント: 暗転、偉い人登場、定員オーバーゾーン
- ターン履歴とリプレイ風演出
