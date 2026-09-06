package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strconv"
	"sync"
	"time"
)

// skipKeys are attribute keys that are not printed in the log output.
var skipKeys = map[string]bool{
	"competitionID": true,
}

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
)

type colorHandler struct {
	mu    *sync.Mutex
	w     io.Writer
	level slog.Level
	attrs []slog.Attr
	group string
}

func newColorHandler(w io.Writer, level slog.Level) *colorHandler {
	return &colorHandler{mu: &sync.Mutex{}, w: w, level: level}
}

func (h *colorHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *colorHandler) Handle(_ context.Context, r slog.Record) error {
	var b []byte

	// level
	lvlStr, lvlColor := levelInfo(r.Level)
	b = append(b, lvlColor...)
	b = append(b, lvlStr...)
	b = append(b, colorReset...)

	b = append(b, " | "...)

	// message
	b = append(b, colorBlue...)
	b = append(b, r.Message...)
	b = append(b, colorReset...)

	// attrs from context
	for _, a := range h.attrs {
		b = h.appendAttr(b, a)
	}

	// attrs from record
	r.Attrs(func(a slog.Attr) bool {
		b = h.appendAttr(b, a)
		return true
	})

	b = append(b, '\n')

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := h.w.Write(b)
	return err
}

func (h *colorHandler) appendAttr(b []byte, a slog.Attr) []byte {
	if a.Equal(slog.Attr{}) {
		return b
	}
	if skipKeys[a.Key] {
		return b
	}
	b = append(b, " | "...)
	b = append(b, colorCyan...)
	b = append(b, attrValue(a.Value)...)
	b = append(b, colorReset...)
	return b
}

func attrValue(v slog.Value) []byte {
	switch v.Kind() {
	case slog.KindString:
		return []byte(v.String())
	case slog.KindInt64:
		return []byte(strconv.FormatInt(v.Int64(), 10))
	case slog.KindUint64:
		return []byte(strconv.FormatUint(v.Uint64(), 10))
	case slog.KindFloat64:
		return []byte(strconv.FormatFloat(v.Float64(), 'f', -1, 64))
	case slog.KindBool:
		return []byte(strconv.FormatBool(v.Bool()))
	case slog.KindDuration:
		return []byte(v.Duration().String())
	case slog.KindTime:
		return []byte(v.Time().Format(time.RFC3339))
	case slog.KindAny:
		return fmt.Append(nil, v.Any())
	default:
		return []byte(v.String())
	}
}

func levelInfo(l slog.Level) (string, string) {
	switch {
	case l >= slog.LevelError:
		return "ERROR", colorRed
	case l >= slog.LevelWarn:
		return "WARN ", colorYellow
	case l >= slog.LevelInfo:
		return "INFO ", colorGreen
	default:
		return "DEBUG", colorGray
	}
}

func (h *colorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &colorHandler{
		mu:    h.mu,
		w:     h.w,
		level: h.level,
		attrs: appendAttrsToGroup(h.attrs, attrs),
	}
}

func (h *colorHandler) WithGroup(name string) slog.Handler {
	return &colorHandler{
		mu:    h.mu,
		w:     h.w,
		level: h.level,
		attrs: h.attrs,
		group: name,
	}
}

func appendAttrsToGroup(base, attrs []slog.Attr) []slog.Attr {
	return append(append([]slog.Attr{}, base...), attrs...)
}
