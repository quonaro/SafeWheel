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

  // Создание заголовка документа
  createHeader(title, subtitle = null) {
    const elements = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ];

    if (subtitle) {
      elements.push(
        new Paragraph({
          text: subtitle,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        })
      );
    }

    elements.push(
      new Paragraph({
        text: `Дата создания: ${this.formatDate(new Date())}`,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 800 },
      })
    );

    return elements;
  }

  // Создание таблицы общих результатов
  createGeneralResultsTable(results, competitionName) {
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ text: "Место", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Команда", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Штрафы", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Время", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Средний возраст",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Участников",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
      ],
    });

    const dataRows = results.map((result, index) => {
      const isTopThree = [1, 2, 3].includes(result.rank);
      const cellShading = isTopThree ? { fill: "FEF3C7" } : undefined;

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: result.rank.toString(),
                alignment: AlignmentType.CENTER,
                children: isTopThree
                  ? [new TextRun({ text: result.rank.toString(), bold: true })]
                  : undefined,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [new Paragraph({ text: result.team_name })],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: result.total_penalties.toString(),
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: this.formatTime(result.total_time),
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: `${Math.round(result.avg_age)}л`,
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: result.participant_count.toString(),
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
              new Paragraph({ text: "Место", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Команда",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Штрафы",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Время", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Участники",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
        ],
      });

      const dataRows = stage.teams.map((team, teamIndex) => {
        const isTopThree = [1, 2, 3].includes(team.rank);
        const cellShading = isTopThree ? { fill: "FEF3C7" } : undefined;

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
                  text: team.rank.toString(),
                  alignment: AlignmentType.CENTER,
                  children: isTopThree
                    ? [new TextRun({ text: team.rank.toString(), bold: true })]
                    : undefined,
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [new Paragraph({ text: team.team_name })],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: team.total_penalties.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: this.formatTime(team.total_time),
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: cellShading,
            }),
            new TableCell({
              children: [new Paragraph({ text: participantsText })],
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
            new Paragraph({ text: "Место", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Участник",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Команда", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Возраст", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Пол", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Штрафы", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "Время", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 17, type: WidthType.PERCENTAGE },
          shading: { fill: "E5E7EB" },
        }),
      ],
    });

    const dataRows = participants.map((participant, index) => {
      const isTopThree = [1, 2, 3].includes(participant.rank);
      const cellShading = isTopThree ? { fill: "FEF3C7" } : undefined;

      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: participant.rank.toString(),
                alignment: AlignmentType.CENTER,
                children: isTopThree
                  ? [
                      new TextRun({
                        text: participant.rank.toString(),
                        bold: true,
                      }),
                    ]
                  : undefined,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [new Paragraph({ text: participant.full_name })],
            shading: cellShading,
          }),
          new TableCell({
            children: [new Paragraph({ text: participant.team_name })],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: participant.age ? participant.age + "л" : "—",
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: participant.gender || "—",
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: participant.total_penalties.toString(),
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: cellShading,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: this.formatTime(participant.total_time),
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
                `Результаты соревнования "${competition.name}"`,
                competition.description || null
              ),
              this.createGeneralResultsTable(results, competition.name),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toBuffer(doc);
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
                `Результаты по этапам "${competition.name}"`,
                competition.description || null
              ),
              ...this.createStageResultsTable(stageData),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toBuffer(doc);
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
                `Личные результаты "${competition.name}"`,
                competition.description || null
              ),
              this.createPersonalResultsTable(participants, competition.name),
            ],
          },
        ],
      });

      const arrayBuffer = await Packer.toBuffer(doc);
      // Конвертируем ArrayBuffer в Uint8Array для передачи в Electron
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Ошибка экспорта личных результатов:", error);
      throw error;
    }
  }
}

export default new WordExportService();
