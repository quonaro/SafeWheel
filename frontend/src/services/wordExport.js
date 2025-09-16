import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  PageNumber,
  Footer,
  Header,
  SectionType,
  UnderlineType,
  ShadingType,
} from "docx";

export class WordExportService {
  constructor() {
    this.api = window.electronAPI?.database;
  }

  // Форматирование времени из секунд в формат ММ:СС
  formatTime(seconds) {
    if (!seconds || seconds === 0) return "00:00";

    const totalSeconds = Math.round(Number(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  // Форматирование даты
  formatDate(date) {
    return new Date(date).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Создание официального подвала документа
  createFooter() {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "─".repeat(80),
            size: 20,
            color: "9ca3af",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 400 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "ПРОТОКОЛ СОСТАВЛЕН",
            bold: true,
            size: 20,
            color: "1f2937",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `Дата: ${this.formatDate(new Date())}`,
            size: 18,
            color: "374151",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Главный судья соревнований",
            bold: true,
            size: 18,
            color: "1f2937",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "_________________",
            size: 18,
            color: "6b7280",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Главный секретарь",
            bold: true,
            size: 18,
            color: "1f2937",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "_________________",
            size: 18,
            color: "6b7280",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 400 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "М.П.",
            bold: true,
            size: 16,
            color: "9ca3af",
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
      }),
    ];
  }

  // Создание официального заголовка документа
  createHeader(title, subtitle = null) {
    const elements = [
      // Официальная шапка
      new Paragraph({
        children: [
          new TextRun({
            text: "РЕЗУЛЬТАТЫ СОРЕВНОВАНИЙ",
            bold: true,
            size: 32,
            color: "1f2937",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "ОФИЦИАЛЬНЫЙ ПРОТОКОЛ",
            bold: true,
            size: 24,
            color: "374151",
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      // Название соревнования
      new Paragraph({
        children: [
          new TextRun({
            text: `"${title}"`,
            bold: true,
            size: 28,
            color: "1f2937",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),

      // Описание соревнования
      ...(subtitle
        ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: subtitle,
                  size: 20,
                  color: "6b7280",
                  italic: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
            }),
          ]
        : []),

      // Информация о дате и месте
      new Paragraph({
        children: [
          new TextRun({
            text: `Дата проведения: ${this.formatDate(new Date())}`,
            size: 18,
            color: "374151",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `Дата составления протокола: ${this.formatDate(new Date())}`,
            size: 18,
            color: "374151",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),

      // Разделительная линия
      new Paragraph({
        children: [
          new TextRun({
            text: "─".repeat(80),
            size: 20,
            color: "9ca3af",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ];

    return elements;
  }

  // Создание официальной таблицы общих результатов
  createGeneralResultsTable(results, competitionName) {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "№",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "НАЗВАНИЕ КОМАНДЫ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ШТРАФНЫЕ ОЧКИ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ВРЕМЯ ПРОХОЖДЕНИЯ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "СРЕДНИЙ ВОЗРАСТ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "КОЛИЧЕСТВО УЧАСТНИКОВ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
      ],
    });

    const dataRows = results.map((result, index) => {
      const isTopThree = [1, 2, 3].includes(result.rank);
      const cellShading = isTopThree
        ? { fill: "FEF3C7", type: ShadingType.SOLID }
        : { fill: "f9fafb", type: ShadingType.SOLID };
      const textColor = isTopThree ? "92400e" : "1f2937";

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.rank.toString(),
                    bold: isTopThree,
                    size: 22,
                    color: textColor,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.team_name,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.total_penalties.toString(),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: this.formatTime(result.total_time),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${Math.round(result.avg_age)} лет`,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.participant_count.toString(),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
        ],
      });
    });

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
    });
  }

  // Создание таблицы результатов по этапам
  createStageResultsTable(stageData) {
    const elements = [];

    stageData.forEach((stage, stageIndex) => {
      // Заголовок этапа
      elements.push(
        new Paragraph({
          text: `Этап ${stageIndex + 1}: ${stage.stage_name}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      // Таблица команд для этапа
      const headerRow = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Место",
                    bold: true,
                    size: 24,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: "e5e7eb", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Команда",
                    bold: true,
                    size: 24,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "e5e7eb", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Штрафы",
                    bold: true,
                    size: 24,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "e5e7eb", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Время",
                    bold: true,
                    size: 24,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "e5e7eb", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Участники",
                    bold: true,
                    size: 24,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: "e5e7eb", type: ShadingType.SOLID },
          }),
        ],
      });

      const dataRows = stage.teams.map((team, teamIndex) => {
        const isTopThree = [1, 2, 3].includes(team.rank);
        const cellShading = isTopThree
          ? { fill: "FEF3C7", type: ShadingType.SOLID }
          : { fill: "f9fafb", type: ShadingType.SOLID };
        const textColor = isTopThree ? "92400e" : "1f2937";

        // Список участников команды
        const participantsText = team.participants
          .map(
            (p) =>
              `${p.full_name} (${p.gender}, ${p.age ? p.age + "л" : "—"}) - ${
                p.penalty_points
              } штр., ${this.formatTime(p.time_seconds)}`
          )
          .join("\n");

        return new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: team.rank.toString(),
                      bold: isTopThree,
                      size: 22,
                      color: textColor,
                    }),
                  ],
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: team.team_name,
                      size: 22,
                      color: textColor,
                      bold: isTopThree,
                    }),
                  ],
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: team.total_penalties.toString(),
                      size: 22,
                      color: textColor,
                      bold: isTopThree,
                    }),
                  ],
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: this.formatTime(team.total_time),
                      size: 22,
                      color: textColor,
                      bold: isTopThree,
                    }),
                  ],
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: participantsText,
                      size: 22,
                      color: textColor,
                    }),
                  ],
                }),
              ],
              shading: cellShading,
            }),
          ],
        });
      });

      elements.push(
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      );

      // Добавляем отступ между этапами
      if (stageIndex < stageData.length - 1) {
        elements.push(new Paragraph({ text: "", spacing: { after: 400 } }));
      }
    });

    return elements;
  }

  // Создание таблицы личных результатов
  createPersonalResultsTable(participants, competitionName) {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "№",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "УЧАСТНИК",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "КОМАНДА",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ВОЗРАСТ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ПОЛ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ШТРАФЫ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ВРЕМЯ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
      ],
    });

    const dataRows = participants.map((participant, index) => {
      const isTopThree = [1, 2, 3].includes(participant.rank);
      const cellShading = isTopThree
        ? { fill: "FEF3C7", type: ShadingType.SOLID }
        : { fill: "f9fafb", type: ShadingType.SOLID };
      const textColor = isTopThree ? "92400e" : "1f2937";

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.rank.toString(),
                    bold: isTopThree,
                    size: 22,
                    color: textColor,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.full_name,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.team_name,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.age ? participant.age + "л" : "—",
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.gender || "—",
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: participant.total_penalties.toString(),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: this.formatTime(participant.total_time),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
        ],
      });
    });

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
    });
  }

  // Экспорт общих результатов
  async exportGeneralResults(competitionId) {
    try {
      const competition = await this.api.getCompetitionById(competitionId);
      const results = await this.api.computeStandings(competitionId);

      const doc = new Document({
        sections: [
          {
            children: [
              ...this.createHeader(
                competition.name,
                competition.description || null
              ),
              this.createGeneralResultsTable(results, competition.name),
              ...this.createFooter(),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      // Конвертируем ArrayBuffer в Uint8Array для передачи в Electron
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта общих результатов:", error);
      throw error;
    }
  }

  // Экспорт результатов по этапам
  async exportStageResults(competitionId) {
    try {
      const competition = await this.api.getCompetitionById(competitionId);
      const stageData = await this.api.getStageStandingsWithParticipants(
        competitionId
      );

      const doc = new Document({
        sections: [
          {
            children: [
              ...this.createHeader(
                competition.name,
                competition.description || null
              ),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "РЕЗУЛЬТАТЫ ПО ЭТАПАМ",
                    bold: true,
                    size: 24,
                    color: "1f2937",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
              }),
              ...this.createStageResultsTable(stageData),
              ...this.createFooter(),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      // Конвертируем ArrayBuffer в Uint8Array для передачи в Electron
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта результатов по этапам:", error);
      throw error;
    }
  }

  // Экспорт личных результатов
  async exportPersonalResults(competitionId) {
    try {
      const competition = await this.api.getCompetitionById(competitionId);
      const participants = await this.api.getParticipantResults(competitionId, {
        limit: 1000,
      });

      const doc = new Document({
        sections: [
          {
            children: [
              ...this.createHeader(
                competition.name,
                competition.description || null
              ),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "ЛИЧНЫЕ РЕЗУЛЬТАТЫ",
                    bold: true,
                    size: 24,
                    color: "1f2937",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
              }),
              this.createPersonalResultsTable(participants, competition.name),
              ...this.createFooter(),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      // Конвертируем ArrayBuffer в Uint8Array для передачи в Electron
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта личных результатов:", error);
      throw error;
    }
  }

  // Экспорт результатов отдельного этапа
  async exportSingleStageResults(competitionId, stageId) {
    try {
      const competition = await this.api.getCompetitionById(competitionId);
      const stage = await this.api.getStageById(stageId);
      const stageData = await this.api.getStageStandingsWithParticipants(
        competitionId
      );
      const singleStageData = stageData.filter((s) => s.stage_id === stageId);

      const doc = new Document({
        sections: [
          {
            children: [
              ...this.createHeader(
                competition.name,
                competition.description || null
              ),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `РЕЗУЛЬТАТЫ ЭТАПА: ${stage.name}`,
                    bold: true,
                    size: 24,
                    color: "1f2937",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
              }),
              ...this.createStageResultsTable(singleStageData),
              ...this.createFooter(),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта результатов этапа:", error);
      throw error;
    }
  }

  // Экспорт полного отчета по соревнованию (все разделы в один документ)
  async exportFullCompetition(competitionId) {
    try {
      const competition = await this.api.getCompetitionById(competitionId);
      const [generalResults, stageData, participants] = await Promise.all([
        this.api.computeStandings(competitionId),
        this.api.getStageStandingsWithParticipants(competitionId),
        this.api.getParticipantResults(competitionId, { limit: 1000 }),
      ]);

      const sectionsChildren = [
        ...this.createHeader(competition.name, competition.description || null),

        // Общие результаты
        new Paragraph({
          children: [
            new TextRun({
              text: "ОБЩИЕ РЕЗУЛЬТАТЫ",
              bold: true,
              size: 24,
              color: "1f2937",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
        }),
        this.createGeneralResultsTable(generalResults, competition.name),

        // Разрыв страницы
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new PageBreak(),

        // Результаты по этапам
        new Paragraph({
          children: [
            new TextRun({
              text: "РЕЗУЛЬТАТЫ ПО ЭТАПАМ",
              bold: true,
              size: 24,
              color: "1f2937",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
        }),
        ...this.createStageResultsTable(stageData),

        // Разрыв страницы
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new PageBreak(),

        // Личные результаты
        new Paragraph({
          children: [
            new TextRun({
              text: "ЛИЧНЫЕ РЕЗУЛЬТАТЫ",
              bold: true,
              size: 24,
              color: "1f2937",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
        }),
        this.createPersonalResultsTable(participants, competition.name),

        ...this.createFooter(),
      ];

      const doc = new Document({
        sections: [
          {
            children: sectionsChildren,
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта полного отчета:", error);
      throw error;
    }
  }

  // Экспорт общих итогов по всем соревнованиям
  async exportAllCompetitionsResults() {
    try {
      const competitions = await this.api.listCompetitions();
      const allResults = [];

      // Получаем результаты всех соревнований
      for (const competition of competitions) {
        const results = await this.api.computeStandings(competition.id);
        const resultsWithCompetition = results.map((result) => ({
          ...result,
          competition_name: competition.name,
          competition_date: competition.date,
        }));
        allResults.push(...resultsWithCompetition);
      }

      // Сортируем по общему времени и штрафам
      allResults.sort((a, b) => {
        if (a.total_penalties !== b.total_penalties) {
          return a.total_penalties - b.total_penalties;
        }
        return a.total_time - b.total_time;
      });

      // Добавляем общий рейтинг
      allResults.forEach((result, index) => {
        result.overall_rank = index + 1;
      });

      const doc = new Document({
        sections: [
          {
            children: [
              ...this.createHeader(
                "ОБЩИЕ ИТОГИ ПО ВСЕМ СОРЕВНОВАНИЯМ",
                "Сводный рейтинг команд по всем проведенным соревнованиям"
              ),
              this.createAllCompetitionsTable(allResults),
              ...this.createFooter(),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toArrayBuffer(doc);
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта общих итогов:", error);
      throw error;
    }
  }

  // Создание таблицы общих итогов по всем соревнованиям
  createAllCompetitionsTable(results) {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ОБЩИЙ РЕЙТИНГ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "КОМАНДА",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "СОРЕВНОВАНИЕ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "МЕСТО В СОРЕВНОВАНИИ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ШТРАФЫ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ВРЕМЯ",
                  bold: true,
                  size: 24,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "e5e7eb", type: ShadingType.SOLID },
        }),
      ],
    });

    const dataRows = results.map((result, index) => {
      const isTopThree = [1, 2, 3].includes(result.overall_rank);
      const cellShading = isTopThree
        ? { fill: "FEF3C7", type: ShadingType.SOLID }
        : { fill: "f9fafb", type: ShadingType.SOLID };
      const textColor = isTopThree ? "92400e" : "1f2937";

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.overall_rank.toString(),
                    bold: isTopThree,
                    size: 22,
                    color: textColor,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.team_name,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.competition_name,
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.rank.toString(),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: result.total_penalties.toString(),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: this.formatTime(result.total_time),
                    size: 22,
                    color: textColor,
                    bold: isTopThree,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
        ],
      });
    });

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.DOUBLE, size: 4, color: "1f2937" },
        bottom: { style: BorderStyle.DOUBLE, size: 4, color: "1f2937" },
        left: { style: BorderStyle.SINGLE, size: 2, color: "1f2937" },
        right: { style: BorderStyle.SINGLE, size: 2, color: "1f2937" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "6b7280",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "6b7280" },
      },
    });
  }
}

export default new WordExportService();
