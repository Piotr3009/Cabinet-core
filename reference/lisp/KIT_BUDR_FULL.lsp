;;;========================================
;;; KIT_BUDR_FULL.lsp
;;; Base Unit Drawer - 3 drawers (4:3:2 ratio)
;;; Requires: SKYLON_COMMON.lsp (with runnerYList param)
;;;========================================

;;;========================================
;;; A. RUNNER GEOMETRY (from RUNNER_EXACT.lsp)
;;;========================================

(defun _mkLineR (p1 p2 lay)
  (entmakex (list (cons 0 "LINE") (cons 8 lay) (cons 10 p1) (cons 11 p2))))

(defun _mkArcR (cen rad ang1 ang2 lay)
  (entmakex (list (cons 0 "ARC") (cons 8 lay) (cons 10 cen) (cons 40 rad) (cons 50 ang1) (cons 51 ang2))))

(defun _ptR (x y) (list x y 0.0))

(defun DRAW-RUNNER-LEFT (x0 y0 lay / )
  ;; Lines 1-30
  (_mkLineR (_ptR (+ x0 6.46) (+ y0 0.0)) (_ptR (+ x0 8.87) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (+ x0 8.87) (+ y0 0.0)) (_ptR (+ x0 8.87) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (+ x0 6.46) (+ y0 0.0)) (_ptR (+ x0 5.91) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (+ x0 5.91) (+ y0 0.0)) (_ptR (+ x0 5.90) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (+ x0 1.8) (+ y0 6.47)) (_ptR (+ x0 1.8) (+ y0 17.63)) lay)
  (_mkLineR (_ptR (+ x0 1.8) (+ y0 17.63)) (_ptR (+ x0 2.5) (+ y0 19.4)) lay)
  (_mkLineR (_ptR (+ x0 2.5) (+ y0 19.4)) (_ptR (+ x0 2.5) (+ y0 44.4)) lay)
  (_mkLineR (_ptR (+ x0 2.5) (+ y0 41.5)) (_ptR (+ x0 2.71) (+ y0 41.43)) lay)
  (_mkLineR (_ptR (+ x0 2.71) (+ y0 41.43)) (_ptR (+ x0 2.8) (+ y0 41.23)) lay)
  (_mkLineR (_ptR (+ x0 2.8) (+ y0 41.23)) (_ptR (+ x0 2.8) (+ y0 34.77)) lay)
  (_mkLineR (_ptR (+ x0 2.8) (+ y0 34.77)) (_ptR (+ x0 2.71) (+ y0 34.57)) lay)
  (_mkLineR (_ptR (+ x0 2.71) (+ y0 34.57)) (_ptR (+ x0 2.5) (+ y0 34.5)) lay)
  (_mkLineR (_ptR (+ x0 2.5) (+ y0 44.4)) (_ptR (+ x0 1.8) (+ y0 46.17)) lay)
  (_mkLineR (_ptR (+ x0 1.8) (+ y0 46.17)) (_ptR (+ x0 1.8) (+ y0 48.9)) lay)
  (_mkLineR (_ptR (+ x0 1.8) (+ y0 48.9)) (_ptR (+ x0 0.0) (+ y0 48.9)) lay)
  (_mkLineR (_ptR (+ x0 0.0) (+ y0 48.9)) (_ptR (+ x0 0.0) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (+ x0 8.87) (+ y0 1.5)) (_ptR (+ x0 38.34) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (+ x0 38.34) (+ y0 1.5)) (_ptR (+ x0 40.08) (+ y0 2.22)) lay)
  (_mkLineR (_ptR (+ x0 40.08) (+ y0 2.22)) (_ptR (+ x0 40.9) (+ y0 4.2)) lay)
  (_mkLineR (_ptR (+ x0 40.9) (+ y0 4.2)) (_ptR (+ x0 40.9) (+ y0 12.5)) lay)
  (_mkLineR (_ptR (+ x0 40.9) (+ y0 12.5)) (_ptR (+ x0 40.17) (+ y0 14.27)) lay)
  (_mkLineR (_ptR (+ x0 40.17) (+ y0 14.27)) (_ptR (+ x0 38.4) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (+ x0 38.4) (+ y0 15.0)) (_ptR (+ x0 31.9) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (+ x0 31.9) (+ y0 15.0)) (_ptR (+ x0 31.9) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (+ x0 31.9) (+ y0 13.2)) (_ptR (+ x0 38.4) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (+ x0 38.4) (+ y0 13.2)) (_ptR (+ x0 38.89) (+ y0 12.99)) lay)
  (_mkLineR (_ptR (+ x0 38.89) (+ y0 12.99)) (_ptR (+ x0 39.1) (+ y0 12.5)) lay)
  (_mkLineR (_ptR (+ x0 39.1) (+ y0 12.5)) (_ptR (+ x0 39.1) (+ y0 4.2)) lay)
  (_mkLineR (_ptR (+ x0 39.1) (+ y0 4.2)) (_ptR (+ x0 38.81) (+ y0 3.49)) lay)
  (_mkLineR (_ptR (+ x0 38.81) (+ y0 3.49)) (_ptR (+ x0 38.1) (+ y0 3.2)) lay)
  ;; Lines 31-60
  (_mkLineR (_ptR (+ x0 38.1) (+ y0 3.2)) (_ptR (+ x0 5.79) (+ y0 3.2)) lay)
  (_mkLineR (_ptR (+ x0 37.3) (+ y0 6.69)) (_ptR (+ x0 37.3) (+ y0 5.21)) lay)
  (_mkLineR (_ptR (+ x0 37.3) (+ y0 5.21)) (_ptR (+ x0 30.78) (+ y0 5.21)) lay)
  (_mkLineR (_ptR (+ x0 30.78) (+ y0 5.21)) (_ptR (+ x0 29.19) (+ y0 5.89)) lay)
  (_mkLineR (_ptR (+ x0 29.19) (+ y0 5.89)) (_ptR (+ x0 28.59) (+ y0 7.39)) lay)
  (_mkLineR (_ptR (+ x0 28.59) (+ y0 7.39)) (_ptR (+ x0 28.59) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (+ x0 28.59) (+ y0 20.62)) (_ptR (+ x0 29.23) (+ y0 22.17)) lay)
  (_mkLineR (_ptR (+ x0 29.23) (+ y0 22.17)) (_ptR (+ x0 30.78) (+ y0 22.81)) lay)
  (_mkLineR (_ptR (+ x0 30.78) (+ y0 22.81)) (_ptR (+ x0 44.86) (+ y0 22.81)) lay)
  (_mkLineR (_ptR (+ x0 44.86) (+ y0 22.81)) (_ptR (+ x0 46.41) (+ y0 22.17)) lay)
  (_mkLineR (_ptR (+ x0 46.41) (+ y0 22.17)) (_ptR (+ x0 47.05) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (+ x0 47.05) (+ y0 20.62)) (_ptR (+ x0 47.05) (+ y0 5.31)) lay)
  (_mkLineR (_ptR (+ x0 47.05) (+ y0 5.31)) (_ptR (+ x0 47.13) (+ y0 5.09)) lay)
  (_mkLineR (_ptR (+ x0 47.13) (+ y0 5.09)) (_ptR (+ x0 47.35) (+ y0 5.0)) lay)
  (_mkLineR (_ptR (+ x0 47.35) (+ y0 5.0)) (_ptR (+ x0 52.35) (+ y0 5.0)) lay)
  (_mkLineR (_ptR (+ x0 52.35) (+ y0 5.0)) (_ptR (+ x0 52.35) (+ y0 3.52)) lay)
  (_mkLineR (_ptR (+ x0 52.35) (+ y0 3.52)) (_ptR (+ x0 47.35) (+ y0 3.52)) lay)
  (_mkLineR (_ptR (+ x0 47.35) (+ y0 3.52)) (_ptR (+ x0 46.08) (+ y0 4.04)) lay)
  (_mkLineR (_ptR (+ x0 46.08) (+ y0 4.04)) (_ptR (+ x0 45.56) (+ y0 5.31)) lay)
  (_mkLineR (_ptR (+ x0 45.56) (+ y0 5.31)) (_ptR (+ x0 45.56) (+ y0 20.62)) lay)
  ;; Lines 61-90
  (_mkLineR (_ptR (+ x0 45.56) (+ y0 20.62)) (_ptR (+ x0 45.35) (+ y0 21.11)) lay)
  (_mkLineR (_ptR (+ x0 45.35) (+ y0 21.11)) (_ptR (+ x0 44.86) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (+ x0 44.86) (+ y0 21.32)) (_ptR (+ x0 30.93) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (+ x0 30.93) (+ y0 21.32)) (_ptR (+ x0 30.78) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (+ x0 30.78) (+ y0 21.32)) (_ptR (+ x0 30.29) (+ y0 21.11)) lay)
  (_mkLineR (_ptR (+ x0 30.29) (+ y0 21.11)) (_ptR (+ x0 30.08) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (+ x0 30.08) (+ y0 20.62)) (_ptR (+ x0 30.08) (+ y0 7.39)) lay)
  (_mkLineR (_ptR (+ x0 30.08) (+ y0 7.39)) (_ptR (+ x0 30.29) (+ y0 6.9)) lay)
  (_mkLineR (_ptR (+ x0 30.29) (+ y0 6.9)) (_ptR (+ x0 30.78) (+ y0 6.69)) lay)
  (_mkLineR (_ptR (+ x0 30.78) (+ y0 6.69)) (_ptR (+ x0 37.59) (+ y0 6.69)) lay)
  (_mkLineR (_ptR (+ x0 37.59) (+ y0 6.69)) (_ptR (+ x0 37.59) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (+ x0 32.09) (+ y0 6.69)) (_ptR (+ x0 32.09) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (+ x0 32.29) (+ y0 15.0)) (_ptR (+ x0 32.29) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (+ x0 37.82) (+ y0 21.32)) (_ptR (+ x0 37.82) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (+ x0 40.9) (+ y0 12.21)) (_ptR (+ x0 45.25) (+ y0 12.21)) lay)
  (_mkLineR (_ptR (+ x0 45.25) (+ y0 12.21)) (_ptR (+ x0 45.25) (+ y0 6.61)) lay)
  (_mkLineR (_ptR (+ x0 45.25) (+ y0 6.61)) (_ptR (+ x0 40.9) (+ y0 6.61)) lay)
  (_mkLineR (_ptR (+ x0 28.6) (+ y0 3.2)) (_ptR (+ x0 28.6) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (+ x0 28.6) (+ y0 6.2)) (_ptR (+ x0 27.1) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (+ x0 27.1) (+ y0 6.2)) (_ptR (+ x0 27.1) (+ y0 9.5)) lay)
  ;; Lines 91-120
  (_mkLineR (_ptR (+ x0 27.1) (+ y0 9.5)) (_ptR (+ x0 26.85) (+ y0 9.5)) lay)
  (_mkLineR (_ptR (+ x0 26.65) (+ y0 10.13)) (_ptR (+ x0 26.85) (+ y0 9.93)) lay)
  (_mkLineR (_ptR (+ x0 26.85) (+ y0 9.93)) (_ptR (+ x0 26.85) (+ y0 5.32)) lay)
  (_mkLineR (_ptR (+ x0 26.85) (+ y0 5.32)) (_ptR (+ x0 26.65) (+ y0 5.12)) lay)
  (_mkLineR (_ptR (+ x0 26.65) (+ y0 5.12)) (_ptR (+ x0 23.05) (+ y0 5.12)) lay)
  (_mkLineR (_ptR (+ x0 23.05) (+ y0 5.12)) (_ptR (+ x0 22.85) (+ y0 5.32)) lay)
  (_mkLineR (_ptR (+ x0 22.85) (+ y0 5.32)) (_ptR (+ x0 22.85) (+ y0 9.93)) lay)
  (_mkLineR (_ptR (+ x0 22.85) (+ y0 9.93)) (_ptR (+ x0 23.05) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (+ x0 23.05) (+ y0 10.13)) (_ptR (+ x0 26.65) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (+ x0 25.48) (+ y0 10.13)) (_ptR (+ x0 25.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (+ x0 25.48) (+ y0 10.63)) (_ptR (+ x0 27.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (+ x0 27.48) (+ y0 10.63)) (_ptR (+ x0 27.48) (+ y0 11.63)) lay)
  (_mkLineR (_ptR (+ x0 27.48) (+ y0 11.63)) (_ptR (+ x0 25.48) (+ y0 11.63)) lay)
  (_mkLineR (_ptR (+ x0 25.48) (+ y0 11.63)) (_ptR (+ x0 25.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (+ x0 25.48) (+ y0 11.63)) (_ptR (+ x0 25.48) (+ y0 26.13)) lay)
  (_mkLineR (_ptR (+ x0 25.48) (+ y0 26.13)) (_ptR (+ x0 24.23) (+ y0 26.13)) lay)
  (_mkLineR (_ptR (+ x0 24.23) (+ y0 26.13)) (_ptR (+ x0 24.23) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (+ x0 24.23) (+ y0 11.89)) (_ptR (+ x0 24.08) (+ y0 12.33)) lay)
  (_mkLineR (_ptR (+ x0 24.08) (+ y0 12.33)) (_ptR (+ x0 24.08) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (+ x0 24.08) (+ y0 26.73)) (_ptR (+ x0 24.28) (+ y0 27.22)) lay)
  ;; Lines 121-152
  (_mkLineR (_ptR (+ x0 24.28) (+ y0 27.22)) (_ptR (+ x0 24.78) (+ y0 27.43)) lay)
  (_mkLineR (_ptR (+ x0 24.78) (+ y0 27.43)) (_ptR (+ x0 51.07) (+ y0 27.43)) lay)
  (_mkLineR (_ptR (+ x0 51.07) (+ y0 27.43)) (_ptR (+ x0 51.57) (+ y0 27.22)) lay)
  (_mkLineR (_ptR (+ x0 51.57) (+ y0 27.22)) (_ptR (+ x0 51.78) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (+ x0 51.78) (+ y0 26.73)) (_ptR (+ x0 51.78) (+ y0 8.52)) lay)
  (_mkLineR (_ptR (+ x0 51.78) (+ y0 8.52)) (_ptR (+ x0 51.57) (+ y0 8.03)) lay)
  (_mkLineR (_ptR (+ x0 51.57) (+ y0 8.03)) (_ptR (+ x0 51.07) (+ y0 7.82)) lay)
  (_mkLineR (_ptR (+ x0 51.07) (+ y0 7.82)) (_ptR (+ x0 48.38) (+ y0 7.82)) lay)
  (_mkLineR (_ptR (+ x0 48.38) (+ y0 7.82)) (_ptR (+ x0 48.38) (+ y0 6.82)) lay)
  (_mkLineR (_ptR (+ x0 48.38) (+ y0 6.82)) (_ptR (+ x0 51.07) (+ y0 6.82)) lay)
  (_mkLineR (_ptR (+ x0 51.07) (+ y0 6.82)) (_ptR (+ x0 52.28) (+ y0 7.32)) lay)
  (_mkLineR (_ptR (+ x0 52.28) (+ y0 7.32)) (_ptR (+ x0 52.77) (+ y0 8.52)) lay)
  (_mkLineR (_ptR (+ x0 52.77) (+ y0 8.52)) (_ptR (+ x0 52.77) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (+ x0 52.77) (+ y0 26.73)) (_ptR (+ x0 52.28) (+ y0 27.93)) lay)
  (_mkLineR (_ptR (+ x0 52.28) (+ y0 27.93)) (_ptR (+ x0 51.07) (+ y0 28.42)) lay)
  (_mkLineR (_ptR (+ x0 51.07) (+ y0 28.42)) (_ptR (+ x0 24.78) (+ y0 28.42)) lay)
  (_mkLineR (_ptR (+ x0 24.78) (+ y0 28.42)) (_ptR (+ x0 23.57) (+ y0 27.93)) lay)
  (_mkLineR (_ptR (+ x0 23.57) (+ y0 27.93)) (_ptR (+ x0 23.07) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (+ x0 23.07) (+ y0 26.73)) (_ptR (+ x0 23.07) (+ y0 12.33)) lay)
  (_mkLineR (_ptR (+ x0 23.07) (+ y0 12.33)) (_ptR (+ x0 23.39) (+ y0 11.34)) lay)
  (_mkLineR (_ptR (+ x0 23.39) (+ y0 11.34)) (_ptR (+ x0 24.23) (+ y0 10.72)) lay)
  (_mkLineR (_ptR (+ x0 29.75) (+ y0 1.5)) (_ptR (+ x0 29.75) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (+ x0 29.75) (+ y0 0.51)) (_ptR (+ x0 52.96) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (+ x0 52.96) (+ y0 0.51)) (_ptR (+ x0 54.8) (+ y0 1.39)) lay)
  (_mkLineR (_ptR (+ x0 54.8) (+ y0 1.39)) (_ptR (+ x0 55.55) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (+ x0 34.22) (+ y0 0.51)) (_ptR (+ x0 34.22) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (+ x0 34.22) (+ y0 0.0)) (_ptR (+ x0 49.01) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (+ x0 49.01) (+ y0 0.0)) (_ptR (+ x0 49.01) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (+ x0 38.34) (+ y0 1.5)) (_ptR (+ x0 38.1) (+ y0 1.4)) lay)
  (_mkLineR (_ptR (+ x0 38.1) (+ y0 1.4)) (_ptR (+ x0 38.12) (+ y0 1.31)) lay)
  (_mkLineR (_ptR (+ x0 38.12) (+ y0 1.31)) (_ptR (+ x0 52.96) (+ y0 1.31)) lay)
  (_mkLineR (_ptR (+ x0 52.96) (+ y0 1.31)) (_ptR (+ x0 54.24) (+ y0 1.96)) lay)
  (_mkLineR (_ptR (+ x0 54.24) (+ y0 1.96)) (_ptR (+ x0 54.75) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (+ x0 54.75) (+ y0 3.3)) (_ptR (+ x0 54.75) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (+ x0 54.75) (+ y0 3.45)) (_ptR (+ x0 55.55) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (+ x0 55.55) (+ y0 3.45)) (_ptR (+ x0 55.55) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (+ x0 52.77) (+ y0 8.52)) (_ptR (+ x0 52.78) (+ y0 6.75)) lay)
  (_mkLineR (_ptR (+ x0 53.53) (+ y0 6.5)) (_ptR (+ x0 53.03) (+ y0 6.5)) lay)
  (_mkLineR (_ptR (+ x0 53.78) (+ y0 6.25)) (_ptR (+ x0 53.73) (+ y0 3.96)) lay)
  (_mkLineR (_ptR (+ x0 54.23) (+ y0 3.46)) (_ptR (+ x0 55.91) (+ y0 3.46)) lay)
  (_mkLineR (_ptR (+ x0 55.91) (+ y0 3.46)) (_ptR (+ x0 59.53) (+ y0 3.46)) lay)
  (_mkLineR (_ptR (+ x0 59.53) (+ y0 3.46)) (_ptR (+ x0 59.67) (+ y0 3.51)) lay)
  (_mkLineR (_ptR (+ x0 59.67) (+ y0 3.51)) (_ptR (+ x0 59.73) (+ y0 3.66)) lay)
  (_mkLineR (_ptR (+ x0 59.73) (+ y0 3.66)) (_ptR (+ x0 62.65) (+ y0 3.73)) lay)
  (_mkLineR (_ptR (+ x0 62.65) (+ y0 3.73)) (_ptR (+ x0 62.59) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (+ x0 62.79) (+ y0 3.21)) (_ptR (+ x0 65.47) (+ y0 3.2)) lay)
  (_mkLineR (_ptR (+ x0 65.64) (+ y0 3.38)) (_ptR (+ x0 65.73) (+ y0 3.79)) lay)
  (_mkLineR (_ptR (+ x0 65.73) (+ y0 3.79)) (_ptR (+ x0 67.63) (+ y0 3.82)) lay)
  (_mkLineR (_ptR (+ x0 67.63) (+ y0 3.82)) (_ptR (+ x0 67.77) (+ y0 3.88)) lay)
  (_mkLineR (_ptR (+ x0 67.77) (+ y0 3.88)) (_ptR (+ x0 67.82) (+ y0 4.02)) lay)
  (_mkLineR (_ptR (+ x0 67.82) (+ y0 4.02)) (_ptR (+ x0 67.82) (+ y0 6.4)) lay)
  (_mkLineR (_ptR (+ x0 67.82) (+ y0 6.4)) (_ptR (+ x0 70.15) (+ y0 17.35)) lay)
  (_mkLineR (_ptR (+ x0 70.15) (+ y0 17.35)) (_ptR (+ x0 70.01) (+ y0 17.94)) lay)
  (_mkLineR (_ptR (+ x0 70.01) (+ y0 17.94)) (_ptR (+ x0 69.48) (+ y0 18.2)) lay)
  (_mkLineR (_ptR (+ x0 69.48) (+ y0 18.2)) (_ptR (+ x0 64.04) (+ y0 18.29)) lay)
  (_mkLineR (_ptR (+ x0 64.04) (+ y0 18.29)) (_ptR (+ x0 62.79) (+ y0 18.82)) lay)
  (_mkLineR (_ptR (+ x0 62.79) (+ y0 18.82)) (_ptR (+ x0 62.28) (+ y0 20.08)) lay)
  (_mkLineR (_ptR (+ x0 62.28) (+ y0 20.08)) (_ptR (+ x0 62.28) (+ y0 27.1)) lay)
  (_mkLineR (_ptR (+ x0 62.28) (+ y0 27.1)) (_ptR (+ x0 62.08) (+ y0 27.59)) lay)
  (_mkLineR (_ptR (+ x0 62.08) (+ y0 27.59)) (_ptR (+ x0 61.6) (+ y0 27.8)) lay)
  (_mkLineR (_ptR (+ x0 61.6) (+ y0 27.8)) (_ptR (+ x0 52.78) (+ y0 28.11)) lay)
  (_mkLineR (_ptR (+ x0 52.78) (+ y0 28.11)) (_ptR (+ x0 52.78) (+ y0 26.73)) lay)
  ;; 7 Arcs
  (_mkArcR (_ptR (+ x0 5.53) (+ y0 7.08)) 5.6 3.3 4.78 lay)
  (_mkArcR (_ptR (+ x0 5.46) (+ y0 6.86)) 3.68 3.25 4.8 lay)
  (_mkArcR (_ptR (+ x0 53.04) (+ y0 6.76)) 0.26 3.19 4.67 lay)
  (_mkArcR (_ptR (+ x0 53.44) (+ y0 6.17)) 0.34 0.24 1.33 lay)
  (_mkArcR (_ptR (+ x0 54.26) (+ y0 3.99)) 0.53 3.2 4.65 lay)
  (_mkArcR (_ptR (+ x0 62.78) (+ y0 3.4)) 0.19 2.89 4.77 lay)
  (_mkArcR (_ptR (+ x0 65.43) (+ y0 3.41)) 0.21 4.9 6.13 lay)
)

(defun DRAW-RUNNER-RIGHT (x0 y0 lay / )
  ;; Lines 1-30 (X mirrored)
  (_mkLineR (_ptR (- x0 6.46) (+ y0 0.0)) (_ptR (- x0 8.87) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (- x0 8.87) (+ y0 0.0)) (_ptR (- x0 8.87) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (- x0 6.46) (+ y0 0.0)) (_ptR (- x0 5.91) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (- x0 5.91) (+ y0 0.0)) (_ptR (- x0 5.90) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (- x0 1.8) (+ y0 6.47)) (_ptR (- x0 1.8) (+ y0 17.63)) lay)
  (_mkLineR (_ptR (- x0 1.8) (+ y0 17.63)) (_ptR (- x0 2.5) (+ y0 19.4)) lay)
  (_mkLineR (_ptR (- x0 2.5) (+ y0 19.4)) (_ptR (- x0 2.5) (+ y0 44.4)) lay)
  (_mkLineR (_ptR (- x0 2.5) (+ y0 41.5)) (_ptR (- x0 2.71) (+ y0 41.43)) lay)
  (_mkLineR (_ptR (- x0 2.71) (+ y0 41.43)) (_ptR (- x0 2.8) (+ y0 41.23)) lay)
  (_mkLineR (_ptR (- x0 2.8) (+ y0 41.23)) (_ptR (- x0 2.8) (+ y0 34.77)) lay)
  (_mkLineR (_ptR (- x0 2.8) (+ y0 34.77)) (_ptR (- x0 2.71) (+ y0 34.57)) lay)
  (_mkLineR (_ptR (- x0 2.71) (+ y0 34.57)) (_ptR (- x0 2.5) (+ y0 34.5)) lay)
  (_mkLineR (_ptR (- x0 2.5) (+ y0 44.4)) (_ptR (- x0 1.8) (+ y0 46.17)) lay)
  (_mkLineR (_ptR (- x0 1.8) (+ y0 46.17)) (_ptR (- x0 1.8) (+ y0 48.9)) lay)
  (_mkLineR (_ptR (- x0 1.8) (+ y0 48.9)) (_ptR (- x0 0.0) (+ y0 48.9)) lay)
  (_mkLineR (_ptR (- x0 0.0) (+ y0 48.9)) (_ptR (- x0 0.0) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (- x0 8.87) (+ y0 1.5)) (_ptR (- x0 38.34) (+ y0 1.5)) lay)
  (_mkLineR (_ptR (- x0 38.34) (+ y0 1.5)) (_ptR (- x0 40.08) (+ y0 2.22)) lay)
  (_mkLineR (_ptR (- x0 40.08) (+ y0 2.22)) (_ptR (- x0 40.9) (+ y0 4.2)) lay)
  (_mkLineR (_ptR (- x0 40.9) (+ y0 4.2)) (_ptR (- x0 40.9) (+ y0 12.5)) lay)
  (_mkLineR (_ptR (- x0 40.9) (+ y0 12.5)) (_ptR (- x0 40.17) (+ y0 14.27)) lay)
  (_mkLineR (_ptR (- x0 40.17) (+ y0 14.27)) (_ptR (- x0 38.4) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (- x0 38.4) (+ y0 15.0)) (_ptR (- x0 31.9) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (- x0 31.9) (+ y0 15.0)) (_ptR (- x0 31.9) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (- x0 31.9) (+ y0 13.2)) (_ptR (- x0 38.4) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (- x0 38.4) (+ y0 13.2)) (_ptR (- x0 38.89) (+ y0 12.99)) lay)
  (_mkLineR (_ptR (- x0 38.89) (+ y0 12.99)) (_ptR (- x0 39.1) (+ y0 12.5)) lay)
  (_mkLineR (_ptR (- x0 39.1) (+ y0 12.5)) (_ptR (- x0 39.1) (+ y0 4.2)) lay)
  (_mkLineR (_ptR (- x0 39.1) (+ y0 4.2)) (_ptR (- x0 38.81) (+ y0 3.49)) lay)
  (_mkLineR (_ptR (- x0 38.81) (+ y0 3.49)) (_ptR (- x0 38.1) (+ y0 3.2)) lay)
  ;; Lines 31-60
  (_mkLineR (_ptR (- x0 38.1) (+ y0 3.2)) (_ptR (- x0 5.79) (+ y0 3.2)) lay)
  (_mkLineR (_ptR (- x0 37.3) (+ y0 6.69)) (_ptR (- x0 37.3) (+ y0 5.21)) lay)
  (_mkLineR (_ptR (- x0 37.3) (+ y0 5.21)) (_ptR (- x0 30.78) (+ y0 5.21)) lay)
  (_mkLineR (_ptR (- x0 30.78) (+ y0 5.21)) (_ptR (- x0 29.19) (+ y0 5.89)) lay)
  (_mkLineR (_ptR (- x0 29.19) (+ y0 5.89)) (_ptR (- x0 28.59) (+ y0 7.39)) lay)
  (_mkLineR (_ptR (- x0 28.59) (+ y0 7.39)) (_ptR (- x0 28.59) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (- x0 28.59) (+ y0 20.62)) (_ptR (- x0 29.23) (+ y0 22.17)) lay)
  (_mkLineR (_ptR (- x0 29.23) (+ y0 22.17)) (_ptR (- x0 30.78) (+ y0 22.81)) lay)
  (_mkLineR (_ptR (- x0 30.78) (+ y0 22.81)) (_ptR (- x0 44.86) (+ y0 22.81)) lay)
  (_mkLineR (_ptR (- x0 44.86) (+ y0 22.81)) (_ptR (- x0 46.41) (+ y0 22.17)) lay)
  (_mkLineR (_ptR (- x0 46.41) (+ y0 22.17)) (_ptR (- x0 47.05) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (- x0 47.05) (+ y0 20.62)) (_ptR (- x0 47.05) (+ y0 5.31)) lay)
  (_mkLineR (_ptR (- x0 47.05) (+ y0 5.31)) (_ptR (- x0 47.13) (+ y0 5.09)) lay)
  (_mkLineR (_ptR (- x0 47.13) (+ y0 5.09)) (_ptR (- x0 47.35) (+ y0 5.0)) lay)
  (_mkLineR (_ptR (- x0 47.35) (+ y0 5.0)) (_ptR (- x0 52.35) (+ y0 5.0)) lay)
  (_mkLineR (_ptR (- x0 52.35) (+ y0 5.0)) (_ptR (- x0 52.35) (+ y0 3.52)) lay)
  (_mkLineR (_ptR (- x0 52.35) (+ y0 3.52)) (_ptR (- x0 47.35) (+ y0 3.52)) lay)
  (_mkLineR (_ptR (- x0 47.35) (+ y0 3.52)) (_ptR (- x0 46.08) (+ y0 4.04)) lay)
  (_mkLineR (_ptR (- x0 46.08) (+ y0 4.04)) (_ptR (- x0 45.56) (+ y0 5.31)) lay)
  (_mkLineR (_ptR (- x0 45.56) (+ y0 5.31)) (_ptR (- x0 45.56) (+ y0 20.62)) lay)
  ;; Lines 61-90
  (_mkLineR (_ptR (- x0 45.56) (+ y0 20.62)) (_ptR (- x0 45.35) (+ y0 21.11)) lay)
  (_mkLineR (_ptR (- x0 45.35) (+ y0 21.11)) (_ptR (- x0 44.86) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (- x0 44.86) (+ y0 21.32)) (_ptR (- x0 30.93) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (- x0 30.93) (+ y0 21.32)) (_ptR (- x0 30.78) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (- x0 30.78) (+ y0 21.32)) (_ptR (- x0 30.29) (+ y0 21.11)) lay)
  (_mkLineR (_ptR (- x0 30.29) (+ y0 21.11)) (_ptR (- x0 30.08) (+ y0 20.62)) lay)
  (_mkLineR (_ptR (- x0 30.08) (+ y0 20.62)) (_ptR (- x0 30.08) (+ y0 7.39)) lay)
  (_mkLineR (_ptR (- x0 30.08) (+ y0 7.39)) (_ptR (- x0 30.29) (+ y0 6.9)) lay)
  (_mkLineR (_ptR (- x0 30.29) (+ y0 6.9)) (_ptR (- x0 30.78) (+ y0 6.69)) lay)
  (_mkLineR (_ptR (- x0 30.78) (+ y0 6.69)) (_ptR (- x0 37.59) (+ y0 6.69)) lay)
  (_mkLineR (_ptR (- x0 37.59) (+ y0 6.69)) (_ptR (- x0 37.59) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (- x0 32.09) (+ y0 6.69)) (_ptR (- x0 32.09) (+ y0 13.2)) lay)
  (_mkLineR (_ptR (- x0 32.29) (+ y0 15.0)) (_ptR (- x0 32.29) (+ y0 21.32)) lay)
  (_mkLineR (_ptR (- x0 37.82) (+ y0 21.32)) (_ptR (- x0 37.82) (+ y0 15.0)) lay)
  (_mkLineR (_ptR (- x0 40.9) (+ y0 12.21)) (_ptR (- x0 45.25) (+ y0 12.21)) lay)
  (_mkLineR (_ptR (- x0 45.25) (+ y0 12.21)) (_ptR (- x0 45.25) (+ y0 6.61)) lay)
  (_mkLineR (_ptR (- x0 45.25) (+ y0 6.61)) (_ptR (- x0 40.9) (+ y0 6.61)) lay)
  (_mkLineR (_ptR (- x0 28.6) (+ y0 3.2)) (_ptR (- x0 28.6) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (- x0 28.6) (+ y0 6.2)) (_ptR (- x0 27.1) (+ y0 6.2)) lay)
  (_mkLineR (_ptR (- x0 27.1) (+ y0 6.2)) (_ptR (- x0 27.1) (+ y0 9.5)) lay)
  ;; Lines 91-120
  (_mkLineR (_ptR (- x0 27.1) (+ y0 9.5)) (_ptR (- x0 26.85) (+ y0 9.5)) lay)
  (_mkLineR (_ptR (- x0 26.65) (+ y0 10.13)) (_ptR (- x0 26.85) (+ y0 9.93)) lay)
  (_mkLineR (_ptR (- x0 26.85) (+ y0 9.93)) (_ptR (- x0 26.85) (+ y0 5.32)) lay)
  (_mkLineR (_ptR (- x0 26.85) (+ y0 5.32)) (_ptR (- x0 26.65) (+ y0 5.12)) lay)
  (_mkLineR (_ptR (- x0 26.65) (+ y0 5.12)) (_ptR (- x0 23.05) (+ y0 5.12)) lay)
  (_mkLineR (_ptR (- x0 23.05) (+ y0 5.12)) (_ptR (- x0 22.85) (+ y0 5.32)) lay)
  (_mkLineR (_ptR (- x0 22.85) (+ y0 5.32)) (_ptR (- x0 22.85) (+ y0 9.93)) lay)
  (_mkLineR (_ptR (- x0 22.85) (+ y0 9.93)) (_ptR (- x0 23.05) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (- x0 23.05) (+ y0 10.13)) (_ptR (- x0 26.65) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (- x0 25.48) (+ y0 10.13)) (_ptR (- x0 25.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (- x0 25.48) (+ y0 10.63)) (_ptR (- x0 27.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (- x0 27.48) (+ y0 10.63)) (_ptR (- x0 27.48) (+ y0 11.63)) lay)
  (_mkLineR (_ptR (- x0 27.48) (+ y0 11.63)) (_ptR (- x0 25.48) (+ y0 11.63)) lay)
  (_mkLineR (_ptR (- x0 25.48) (+ y0 11.63)) (_ptR (- x0 25.48) (+ y0 10.63)) lay)
  (_mkLineR (_ptR (- x0 25.48) (+ y0 11.63)) (_ptR (- x0 25.48) (+ y0 26.13)) lay)
  (_mkLineR (_ptR (- x0 25.48) (+ y0 26.13)) (_ptR (- x0 24.23) (+ y0 26.13)) lay)
  (_mkLineR (_ptR (- x0 24.23) (+ y0 26.13)) (_ptR (- x0 24.23) (+ y0 10.13)) lay)
  (_mkLineR (_ptR (- x0 24.23) (+ y0 11.89)) (_ptR (- x0 24.08) (+ y0 12.33)) lay)
  (_mkLineR (_ptR (- x0 24.08) (+ y0 12.33)) (_ptR (- x0 24.08) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (- x0 24.08) (+ y0 26.73)) (_ptR (- x0 24.28) (+ y0 27.22)) lay)
  ;; Lines 121-152
  (_mkLineR (_ptR (- x0 24.28) (+ y0 27.22)) (_ptR (- x0 24.78) (+ y0 27.43)) lay)
  (_mkLineR (_ptR (- x0 24.78) (+ y0 27.43)) (_ptR (- x0 51.07) (+ y0 27.43)) lay)
  (_mkLineR (_ptR (- x0 51.07) (+ y0 27.43)) (_ptR (- x0 51.57) (+ y0 27.22)) lay)
  (_mkLineR (_ptR (- x0 51.57) (+ y0 27.22)) (_ptR (- x0 51.78) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (- x0 51.78) (+ y0 26.73)) (_ptR (- x0 51.78) (+ y0 8.52)) lay)
  (_mkLineR (_ptR (- x0 51.78) (+ y0 8.52)) (_ptR (- x0 51.57) (+ y0 8.03)) lay)
  (_mkLineR (_ptR (- x0 51.57) (+ y0 8.03)) (_ptR (- x0 51.07) (+ y0 7.82)) lay)
  (_mkLineR (_ptR (- x0 51.07) (+ y0 7.82)) (_ptR (- x0 48.38) (+ y0 7.82)) lay)
  (_mkLineR (_ptR (- x0 48.38) (+ y0 7.82)) (_ptR (- x0 48.38) (+ y0 6.82)) lay)
  (_mkLineR (_ptR (- x0 48.38) (+ y0 6.82)) (_ptR (- x0 51.07) (+ y0 6.82)) lay)
  (_mkLineR (_ptR (- x0 51.07) (+ y0 6.82)) (_ptR (- x0 52.28) (+ y0 7.32)) lay)
  (_mkLineR (_ptR (- x0 52.28) (+ y0 7.32)) (_ptR (- x0 52.77) (+ y0 8.52)) lay)
  (_mkLineR (_ptR (- x0 52.77) (+ y0 8.52)) (_ptR (- x0 52.77) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (- x0 52.77) (+ y0 26.73)) (_ptR (- x0 52.28) (+ y0 27.93)) lay)
  (_mkLineR (_ptR (- x0 52.28) (+ y0 27.93)) (_ptR (- x0 51.07) (+ y0 28.42)) lay)
  (_mkLineR (_ptR (- x0 51.07) (+ y0 28.42)) (_ptR (- x0 24.78) (+ y0 28.42)) lay)
  (_mkLineR (_ptR (- x0 24.78) (+ y0 28.42)) (_ptR (- x0 23.57) (+ y0 27.93)) lay)
  (_mkLineR (_ptR (- x0 23.57) (+ y0 27.93)) (_ptR (- x0 23.07) (+ y0 26.73)) lay)
  (_mkLineR (_ptR (- x0 23.07) (+ y0 26.73)) (_ptR (- x0 23.07) (+ y0 12.33)) lay)
  (_mkLineR (_ptR (- x0 23.07) (+ y0 12.33)) (_ptR (- x0 23.39) (+ y0 11.34)) lay)
  (_mkLineR (_ptR (- x0 23.39) (+ y0 11.34)) (_ptR (- x0 24.23) (+ y0 10.72)) lay)
  (_mkLineR (_ptR (- x0 29.75) (+ y0 1.5)) (_ptR (- x0 29.75) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (- x0 29.75) (+ y0 0.51)) (_ptR (- x0 52.96) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (- x0 52.96) (+ y0 0.51)) (_ptR (- x0 54.8) (+ y0 1.39)) lay)
  (_mkLineR (_ptR (- x0 54.8) (+ y0 1.39)) (_ptR (- x0 55.55) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (- x0 34.22) (+ y0 0.51)) (_ptR (- x0 34.22) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (- x0 34.22) (+ y0 0.0)) (_ptR (- x0 49.01) (+ y0 0.0)) lay)
  (_mkLineR (_ptR (- x0 49.01) (+ y0 0.0)) (_ptR (- x0 49.01) (+ y0 0.51)) lay)
  (_mkLineR (_ptR (- x0 38.34) (+ y0 1.5)) (_ptR (- x0 38.1) (+ y0 1.4)) lay)
  (_mkLineR (_ptR (- x0 38.1) (+ y0 1.4)) (_ptR (- x0 38.12) (+ y0 1.31)) lay)
  (_mkLineR (_ptR (- x0 38.12) (+ y0 1.31)) (_ptR (- x0 52.96) (+ y0 1.31)) lay)
  (_mkLineR (_ptR (- x0 52.96) (+ y0 1.31)) (_ptR (- x0 54.24) (+ y0 1.96)) lay)
  (_mkLineR (_ptR (- x0 54.24) (+ y0 1.96)) (_ptR (- x0 54.75) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (- x0 54.75) (+ y0 3.3)) (_ptR (- x0 54.75) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (- x0 54.75) (+ y0 3.45)) (_ptR (- x0 55.55) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (- x0 55.55) (+ y0 3.45)) (_ptR (- x0 55.55) (+ y0 3.3)) lay)
  (_mkLineR (_ptR (- x0 52.77) (+ y0 8.52)) (_ptR (- x0 52.78) (+ y0 6.75)) lay)
  (_mkLineR (_ptR (- x0 53.53) (+ y0 6.5)) (_ptR (- x0 53.03) (+ y0 6.5)) lay)
  (_mkLineR (_ptR (- x0 53.78) (+ y0 6.25)) (_ptR (- x0 53.73) (+ y0 3.96)) lay)
  (_mkLineR (_ptR (- x0 54.23) (+ y0 3.46)) (_ptR (- x0 55.91) (+ y0 3.46)) lay)
  (_mkLineR (_ptR (- x0 55.91) (+ y0 3.46)) (_ptR (- x0 59.53) (+ y0 3.46)) lay)
  (_mkLineR (_ptR (- x0 59.53) (+ y0 3.46)) (_ptR (- x0 59.67) (+ y0 3.51)) lay)
  (_mkLineR (_ptR (- x0 59.67) (+ y0 3.51)) (_ptR (- x0 59.73) (+ y0 3.66)) lay)
  (_mkLineR (_ptR (- x0 59.73) (+ y0 3.66)) (_ptR (- x0 62.65) (+ y0 3.73)) lay)
  (_mkLineR (_ptR (- x0 62.65) (+ y0 3.73)) (_ptR (- x0 62.59) (+ y0 3.45)) lay)
  (_mkLineR (_ptR (- x0 62.79) (+ y0 3.21)) (_ptR (- x0 65.47) (+ y0 3.2)) lay)
  (_mkLineR (_ptR (- x0 65.64) (+ y0 3.38)) (_ptR (- x0 65.73) (+ y0 3.79)) lay)
  (_mkLineR (_ptR (- x0 65.73) (+ y0 3.79)) (_ptR (- x0 67.63) (+ y0 3.82)) lay)
  (_mkLineR (_ptR (- x0 67.63) (+ y0 3.82)) (_ptR (- x0 67.77) (+ y0 3.88)) lay)
  (_mkLineR (_ptR (- x0 67.77) (+ y0 3.88)) (_ptR (- x0 67.82) (+ y0 4.02)) lay)
  (_mkLineR (_ptR (- x0 67.82) (+ y0 4.02)) (_ptR (- x0 67.82) (+ y0 6.4)) lay)
  (_mkLineR (_ptR (- x0 67.82) (+ y0 6.4)) (_ptR (- x0 70.15) (+ y0 17.35)) lay)
  (_mkLineR (_ptR (- x0 70.15) (+ y0 17.35)) (_ptR (- x0 70.01) (+ y0 17.94)) lay)
  (_mkLineR (_ptR (- x0 70.01) (+ y0 17.94)) (_ptR (- x0 69.48) (+ y0 18.2)) lay)
  (_mkLineR (_ptR (- x0 69.48) (+ y0 18.2)) (_ptR (- x0 64.04) (+ y0 18.29)) lay)
  (_mkLineR (_ptR (- x0 64.04) (+ y0 18.29)) (_ptR (- x0 62.79) (+ y0 18.82)) lay)
  (_mkLineR (_ptR (- x0 62.79) (+ y0 18.82)) (_ptR (- x0 62.28) (+ y0 20.08)) lay)
  (_mkLineR (_ptR (- x0 62.28) (+ y0 20.08)) (_ptR (- x0 62.28) (+ y0 27.1)) lay)
  (_mkLineR (_ptR (- x0 62.28) (+ y0 27.1)) (_ptR (- x0 62.08) (+ y0 27.59)) lay)
  (_mkLineR (_ptR (- x0 62.08) (+ y0 27.59)) (_ptR (- x0 61.6) (+ y0 27.8)) lay)
  (_mkLineR (_ptR (- x0 61.6) (+ y0 27.8)) (_ptR (- x0 52.78) (+ y0 28.11)) lay)
  (_mkLineR (_ptR (- x0 52.78) (+ y0 28.11)) (_ptR (- x0 52.78) (+ y0 26.73)) lay)
  ;; 7 Arcs (mirrored: pi-end, pi-start)
  (_mkArcR (_ptR (- x0 5.53) (+ y0 7.08)) 5.6 1.64 3.0 lay)
  (_mkArcR (_ptR (- x0 5.46) (+ y0 6.86)) 3.68 1.48 3.03 lay)
  (_mkArcR (_ptR (- x0 53.04) (+ y0 6.76)) 0.26 1.53 2.09 lay)
  (_mkArcR (_ptR (- x0 53.44) (+ y0 6.17)) 0.34 1.81 2.9 lay)
  (_mkArcR (_ptR (- x0 54.26) (+ y0 3.99)) 0.53 1.63 2.08 lay)
  (_mkArcR (_ptR (- x0 62.78) (+ y0 3.4)) 0.19 1.51 2.39 lay)
  (_mkArcR (_ptR (- x0 65.43) (+ y0 3.41)) 0.21 0.15 1.38 lay)
)

;;;========================================
;;; B. RUNNER BLOCK CREATION
;;;========================================

(defun _createRunnerBlockLeft (/ blk lay ss lastEnt ent)
  (setq blk "RUNNER_L")
  (if (tblsearch "BLOCK" blk)
    T
    (progn
      (setq lay "0")
      (setq lastEnt (entlast))
      (DRAW-RUNNER-LEFT 0.0 0.0 lay)
      (setq ss (ssadd))
      (setq ent (entnext lastEnt))
      (while ent
        (ssadd ent ss)
        (setq ent (entnext ent)))
      (if (> (sslength ss) 0)
        (progn
          (command "._-BLOCK" blk "_non" (list 0.0 0.0 0.0) ss "")
          T)
        nil))))

(defun _createRunnerBlockRight (/ blk lay ss lastEnt ent)
  (setq blk "RUNNER_R")
  (if (tblsearch "BLOCK" blk)
    T
    (progn
      (setq lay "0")
      (setq lastEnt (entlast))
      (DRAW-RUNNER-RIGHT 0.0 0.0 lay)
      (setq ss (ssadd))
      (setq ent (entnext lastEnt))
      (while ent
        (ssadd ent ss)
        (setq ent (entnext ent)))
      (if (> (sslength ss) 0)
        (progn
          (command "._-BLOCK" blk "_non" (list 0.0 0.0 0.0) ss "")
          T)
        nil))))

;;;========================================
;;; C. FRONT VIEW - RUNNERS (6 blocks: 3L + 3R)
;;;========================================

(defun drawFrontRunners (x0 y0 szer G wysFRONT1 wysFRONT2 / xL xR runnerY1 runnerY2 runnerY3 oldLay)
  (_createRunnerBlockLeft)
  (_createRunnerBlockRight)
  
  (setq xL (+ x0 G))
  (setq xR (- (+ x0 szer) G))
  (setq runnerY1 (+ y0 G))
  (setq runnerY2 (+ y0 wysFRONT1 3.0))
  (setq runnerY3 (+ y0 wysFRONT1 3.0 wysFRONT2 3.0))
  
  (setq oldLay (getvar "CLAYER"))
  (setvar "CLAYER" "RUNNERS")
  
  (command "._-INSERT" "RUNNER_L" "_non" (list xL runnerY1) 1.0 1.0 0.0)
  (command "._-INSERT" "RUNNER_L" "_non" (list xL runnerY2) 1.0 1.0 0.0)
  (command "._-INSERT" "RUNNER_L" "_non" (list xL runnerY3) 1.0 1.0 0.0)
  (command "._-INSERT" "RUNNER_R" "_non" (list xR runnerY1) 1.0 1.0 0.0)
  (command "._-INSERT" "RUNNER_R" "_non" (list xR runnerY2) 1.0 1.0 0.0)
  (command "._-INSERT" "RUNNER_R" "_non" (list xR runnerY3) 1.0 1.0 0.0)
  
  (setvar "CLAYER" oldLay))

;;;========================================
;;; D. FRONT VIEW - DRAWER BOXES + FRONTS
;;;========================================

;;; Draw 3 drawer boxes in FRONT VIEW 1 (carcase view)
(defun drawFrontDrawerBoxes (x0 y0 szer wys G wysFRONT1 wysFRONT2 wysFRONT3 / 
                              boxX1 boxX2 boxY1 boxY2 boxY3 boxH1 boxH2 boxH3)
  (setq boxX1 (+ x0 G 5.0))
  (setq boxX2 (- (+ x0 szer) G 5.0))
  (setq boxH1 (* wysFRONT1 0.70))
  (setq boxH2 (* wysFRONT2 0.70))
  (setq boxH3 (* wysFRONT3 0.70))
  (setq boxY1 (+ y0 G 38.0))
  (setq boxY2 (+ y0 wysFRONT1 3.0 38.0))
  (setq boxY3 (+ y0 wysFRONT1 3.0 wysFRONT2 3.0 38.0))
  (drawRect "DRAWERS" boxX1 boxY1 boxX2 (+ boxY1 boxH1))
  (drawRect "DRAWERS" boxX1 boxY2 boxX2 (+ boxY2 boxH2))
  (drawRect "DRAWERS" boxX1 boxY3 boxX2 (+ boxY3 boxH3)))

;;; Draw 3 drawer fronts in FRONT VIEW 2 (with fronts)
;;; On DOORS layer (magenta) - Flat, Shaker or Handleless
(defun drawFrontDrawerFronts (x0 y0 szer wys G wysFRONT1 wysFRONT2 wysFRONT3 doorType /
                               frontX1 frontX2 frontY1 frontY2 frontY3 frameOff jGroove)
  (setq frontX1 (+ x0 1.5))
  (setq frontX2 (- (+ x0 szer) 1.5))
  (setq frameOff 50.0)
  (setq jGroove 30.0)
  (setq frontY1 y0)
  (setq frontY2 (+ y0 wysFRONT1 3.0))
  (setq frontY3 (+ y0 wysFRONT1 3.0 wysFRONT2 3.0))
  
  (cond
    ((= doorType "F")
      (drawRect "DOORS" frontX1 frontY1 frontX2 (+ frontY1 wysFRONT1))
      (drawRect "DOORS" frontX1 frontY2 frontX2 (+ frontY2 wysFRONT2))
      (drawRect "DOORS" frontX1 frontY3 frontX2 (+ frontY3 wysFRONT3)))
    ((= doorType "H")
      (drawRect "DOORS" frontX1 frontY1 frontX2 (+ frontY1 wysFRONT1))
      (drawLine "DOORS" frontX1 (- (+ frontY1 wysFRONT1) jGroove) frontX2 (- (+ frontY1 wysFRONT1) jGroove))
      (drawRect "DOORS" frontX1 frontY2 frontX2 (+ frontY2 wysFRONT2))
      (drawLine "DOORS" frontX1 (- (+ frontY2 wysFRONT2) jGroove) frontX2 (- (+ frontY2 wysFRONT2) jGroove))
      (drawRect "DOORS" frontX1 frontY3 frontX2 (+ frontY3 wysFRONT3))
      (drawLine "DOORS" frontX1 (- (+ frontY3 wysFRONT3) jGroove) frontX2 (- (+ frontY3 wysFRONT3) jGroove)))
    (T
      (drawRect "DOORS" frontX1 frontY1 frontX2 (+ frontY1 wysFRONT1))
      (if (> wysFRONT1 120.0)
        (drawRect "DOORS" (+ frontX1 frameOff) (+ frontY1 frameOff) (- frontX2 frameOff) (- (+ frontY1 wysFRONT1) frameOff)))
      (drawRect "DOORS" frontX1 frontY2 frontX2 (+ frontY2 wysFRONT2))
      (if (> wysFRONT2 120.0)
        (drawRect "DOORS" (+ frontX1 frameOff) (+ frontY2 frameOff) (- frontX2 frameOff) (- (+ frontY2 wysFRONT2) frameOff)))
      (drawRect "DOORS" frontX1 frontY3 frontX2 (+ frontY3 wysFRONT3))
      (if (> wysFRONT3 120.0)
        (drawRect "DOORS" (+ frontX1 frameOff) (+ frontY3 frameOff) (- frontX2 frameOff) (- (+ frontY3 wysFRONT3) frameOff))))))

;;;========================================
;;; E. CNC DRAWER PANELS (drawer box parts)
;;;========================================

;;; Create drawer-specific CNC layers
(defun createDrawerCNCLayers ()
  (command "._LAYER" "_N" "DRAWERS" "_C" "8" "DRAWERS" "")
  (command "._LAYER" "_N" "RUNNERS_3MM" "_C" "5" "RUNNERS_3MM" "")
  (command "._LAYER" "_N" "DRAWER_FRONT_OUTLINE" "_C" "6" "DRAWER_FRONT_OUTLINE" "")
  (command "._LAYER" "_N" "DRAWER_SIDE_OUTLINE" "_C" "8" "DRAWER_SIDE_OUTLINE" "")
  (command "._LAYER" "_N" "DRAWER_RUNNER_POCKET" "_C" "1" "DRAWER_RUNNER_POCKET" "")
  (command "._LAYER" "_N" "DRAWER_BOTTOM_POCKET" "_C" "2" "DRAWER_BOTTOM_POCKET" ""))

;;; Drawer side panel
(defun drawDRAWER_SIDE (x0 y0 szufDl wysSIDE unitNum drawerNum sideNum G / midX midY)
  (setq midX (+ x0 (/ wysSIDE 2.0)) midY (+ y0 (/ szufDl 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 wysSIDE) (+ y0 szufDl))
  (drawRect "DRAWER_RUNNER_POCKET" x0 (- y0 10.0) (+ x0 15.0) (+ y0 szufDl 10.0))
  (drawRect "DRAWER_BOTTOM_POCKET" (+ x0 15.0) (- y0 10.0) (+ x0 15.0 G 1.0) (+ y0 szufDl 10.0))
  (drawText "UNIT_NUMBER" midX midY 30.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Drawer box front/back panel
(defun drawDRAWER_BOX_FRONT (x0 y0 dlBox wysBox unitNum drawerNum isFront / midX midY)
  (setq midX (+ x0 (/ wysBox 2.0)) midY (+ y0 (/ dlBox 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 wysBox) (+ y0 dlBox))
  (if isFront
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 dlBox -50.0) 1.5)))
  (drawText "UNIT_NUMBER" midX midY 24.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Drawer bottom panel
(defun drawDRAWER_BOTTOM (x0 y0 szerDno dlDno unitNum drawerNum / midX midY)
  (setq midX (+ x0 (/ szerDno 2.0)) midY (+ y0 (/ dlDno 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 szerDno) (+ y0 dlDno))
  (drawCircle "SCREWS_3MM" (+ x0 70.0) (+ y0 9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szerDno -70.0) (+ y0 9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 70.0) (+ y0 dlDno -9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szerDno -70.0) (+ y0 dlDno -9.0) 1.5)
  (drawText "UNIT_NUMBER" midX midY 24.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Drawer front panel (visible front)
(defun drawDRAWER_FRONT (x0 y0 szer wys unitNum drawerNum G / midX midY holeX1 holeX2 holeY)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (drawRect "DRAWER_FRONT_OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  (setq holeX1 (+ x0 50.0 (* 2.0 G) 3.5))
  (setq holeX2 (- (+ x0 szer) 50.0 (* 2.0 G) 3.5))
  (if (= drawerNum 1)
    (setq holeY (+ y0 96.5 G))
    (setq holeY (+ y0 96.5)))
  (drawCircle "FRONT_HINGES_3MM" holeX1 holeY 1.5)
  (drawCircle "FRONT_HINGES_3MM" holeX2 holeY 1.5)
  (drawText "UNIT_NUMBER" midX midY 40.0 (strcat unitNum "-F" (itoa drawerNum))))

;;;========================================
;;; F. MAIN COMMAND - BUDR_FULL
;;; Uses COMMON: drawBUL/drawBUR (with runnerYList),
;;;   drawTOP_ROT90, drawBOTTOM_ROT90, drawBACK,
;;;   drawFrontCarcase, drawFrontCarcaseOutline,
;;;   drawLegPair, drawDoor, createViewLayers,
;;;   createCNCLayers, createDrawerLayers
;;;========================================

(defun c:BUDR_FULL ( / gruboscPlyty gruboscDrzwi doorType szerSzafki wysSzafki glSzafki unitNum drawCNC pt
                      x0 y0 wewSzer wewGl doorGap szufBok
                      wysFRONT1 wysFRONT2 wysFRONT3 dostepneH szerFRONT
                      szufSzer maxDl szufDl szufX szufY
                      frontY1 frontY2
                      cncX0 cncY0 odstep curX
                      szerBUL wysBUL szerTOP wysTOP szerBACK wysBACK
                      runnerY1 runnerY2 runnerY3
                      wysSIDE1 wysSIDE2 wysSIDE3
                      dlBoxFront wysBoxFront1 wysBoxFront2 wysBoxFront3
                      szerDno dlDno
                      summaryX summaryY lineH totalPanels totalSQM totalEdging
                      csvPath csvFile
                      _oldCmdecho _oldOsmode _oldClayer _olderr)
  
  ;; Save state
  (setq _oldCmdecho (getvar "CMDECHO"))
  (setq _oldOsmode  (getvar "OSMODE"))
  (setq _oldClayer  (getvar "CLAYER"))
  (setq _olderr *error*)
  
  ;; Error handler
  (defun *error* (msg)
    (if _oldClayer  (setvar "CLAYER"  _oldClayer))
    (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
    (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
    (setq *error* _olderr)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*QUIT*,*EXIT*")))
      (princ (strcat "\nERROR: " msg)))
    (princ))
  
  (setvar "CMDECHO" 0)
  (setvar "INSUNITS" 4)
  (setvar "MEASUREMENT" 1)
  
  ;;--- Questions ---
  (setq gruboscPlyty (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null gruboscPlyty) (<= gruboscPlyty 0.0)) (setq gruboscPlyty 18.0))
  
  (setq gruboscDrzwi (getreal "\nFront THICKNESS [mm] (18=MDF, 19=melamine, 25=shaker) <25>: "))
  (if (or (null gruboscDrzwi) (<= gruboscDrzwi 0.0)) (setq gruboscDrzwi 25.0))
  
  (setq doorType (getstring "\nFront type [S=Shaker, H=Handleless (J-groove), F=Flat] <S>: "))
  (if (= doorType "") (setq doorType "S"))
  (setq doorType (strcase doorType))
  (if (not (or (= doorType "F") (= doorType "S") (= doorType "H"))) (setq doorType "S"))
  
  (setq szerSzafki (getreal "\nCabinet WIDTH [mm] <600>: "))
  (if (or (null szerSzafki) (<= szerSzafki 0.0)) (setq szerSzafki 600.0))
  
  (setq glSzafki (getreal "\nCabinet DEPTH [mm] <558>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 558.0))
  
  (setq wysSzafki (getreal "\nCabinet HEIGHT [mm] <770>: "))
  (if (or (null wysSzafki) (<= wysSzafki 0.0)) (setq wysSzafki 770.0))
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. DR1, DR2): "))
  (if (= unitNum "") (setq unitNum "DR1"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (setq drawCNC (strcase drawCNC))
  (if (/= drawCNC "Y") (setq drawCNC "N"))
  
  (setq x0 (car pt) y0 (cadr pt))
  
  ;;--- Calculations ---
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  (setq szufBok 18.0)
  
  ;; Drawer front heights (ratio 4:3:2)
  (setq dostepneH (- wysSzafki 9.0))
  (setq wysFRONT1 (fix (+ (/ (* dostepneH 4.0) 9.0) 0.5)))
  (setq wysFRONT2 (fix (+ (/ (* dostepneH 3.0) 9.0) 0.5)))
  (setq wysFRONT3 (fix (+ (/ (* dostepneH 2.0) 9.0) 0.5)))
  (setq szerFRONT (- szerSzafki 3.0))
  
  ;; Drawer width and depth
  (setq szufSzer (- wewSzer 10.0))
  (setq maxDl (- glSzafki gruboscPlyty 20.0))
  (setq szufDl 390.0)
  (if (>= maxDl 440.0) (setq szufDl 440.0))
  (if (>= maxDl 490.0) (setq szufDl 490.0))
  (if (>= maxDl 540.0) (setq szufDl 540.0))
  (if (>= maxDl 590.0) (setq szufDl 590.0))
  (if (>= maxDl 640.0) (setq szufDl 640.0))
  (if (>= maxDl 690.0) (setq szufDl 690.0))
  
  ;; Drawer position (top view)
  (setq szufX (+ x0 gruboscPlyty 5.0))
  (setq szufY (- y0 doorGap))
  
  ;;--- Create layers ---
  (createViewLayers)
  (createDrawerLayers)
  (command "._LAYER" "_N" "DRAWERS" "_C" "8" "DRAWERS" "")
  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      (createDrawerCNCLayers)))
  
  ;;;========================================
  ;;; TOP VIEW - CARCASE
  ;;;========================================
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" x0 (- (+ y0 glSzafki) gruboscPlyty) (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;;;========================================
  ;;; TOP VIEW - DRAWER (bottom drawer visible)
  ;;;========================================
  (drawRect "DRAWERS" szufX szufY (+ szufX szufBok) (+ szufY szufDl))
  (drawRect "DRAWERS" (- (+ szufX szufSzer) szufBok) szufY (+ szufX szufSzer) (+ szufY szufDl))
  (drawRect "DRAWERS" (+ szufX szufBok) szufY (- (+ szufX szufSzer) szufBok) (+ szufY szufBok))
  (drawRect "DRAWERS" (+ szufX szufBok) (- (+ szufY szufDl) szufBok) (- (+ szufX szufSzer) szufBok) (+ szufY szufDl))
  
  ;;;========================================
  ;;; TOP VIEW - FRONT (bottom drawer front)
  ;;;========================================
  (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
  
  ;; Unit number + dimension
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ y0 (/ glSzafki 2.0)) 30.0 unitNum)
  (drawDimH x0 (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;;;========================================
  ;;; FRONT VIEW 1 - carcase + drawer boxes + runners + legs
  ;;;========================================
  (setq frontY1 (+ y0 glSzafki 600.0))
  (drawFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty)
  (drawFrontDrawerBoxes x0 frontY1 szerSzafki wysSzafki gruboscPlyty wysFRONT1 wysFRONT2 wysFRONT3)
  (drawFrontRunners x0 frontY1 szerSzafki gruboscPlyty wysFRONT1 wysFRONT2)
  (drawLegPair x0 frontY1 szerSzafki gruboscPlyty)
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY1 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront x0 (+ x0 szerSzafki) frontY1)
  
  ;;;========================================
  ;;; FRONT VIEW 2 - outline + fronts (magenta) + legs
  ;;;========================================
  (setq frontY2 (+ frontY1 wysSzafki 1800.0))
  (drawFrontCarcaseOutline x0 frontY2 szerSzafki wysSzafki unitNum)
  (drawFrontDrawerFronts x0 frontY2 szerSzafki wysSzafki gruboscPlyty wysFRONT1 wysFRONT2 wysFRONT3 doorType)
  (drawLegPair x0 frontY2 szerSzafki gruboscPlyty)
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY2 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront (+ x0 1.5) (- (+ x0 szerSzafki) 1.5) frontY2)
  
  ;;;========================================
  ;;; CNC PANELS (optional)
  ;;; Uses COMMON drawBUL/drawBUR with runnerYList
  ;;; Puzzle joints: 10.5mm tenon, 19/25mm notch (unified)
  ;;;========================================
  (if (= drawCNC "Y")
    (progn
      ;; CNC insertion point - user clicks where to place panels
      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX0 (car cncPt) cncY0 (cadr cncPt) odstep 50.0 curX cncX0)
      
      ;; CNC panel dimensions
      (setq szerBUL (- glSzafki gruboscPlyty) wysBUL wysSzafki)
      (setq szerTOP (- szerSzafki (* 2.0 gruboscPlyty)) wysTOP (- glSzafki gruboscPlyty))
      (setq szerBACK szerSzafki wysBACK wysSzafki)
      
      ;; Runner Y positions (relative to panel base, drawBUL/BUR adds y0)
      (setq runnerY1 (+ 38.0 gruboscPlyty))
      (setq runnerY2 (+ wysFRONT1 3.0 38.0))
      (setq runnerY3 (+ wysFRONT1 3.0 wysFRONT2 3.0 38.0))
      
      ;; 1. BUL (COMMON - no hinges, no shelves, with runners)
      (drawBUL curX cncY0 szerBUL wysBUL unitNum 0 gruboscPlyty nil nil (list runnerY1 runnerY2 runnerY3))
      (setq curX (+ curX szerBUL odstep))
      
      ;; 2. BUR (COMMON - no hinges, no shelves, with runners)
      (drawBUR curX cncY0 szerBUL wysBUL unitNum 0 gruboscPlyty nil nil (list runnerY1 runnerY2 runnerY3))
      (setq curX (+ curX szerBUL odstep))
      
      ;; 3. TOP (COMMON - rotated 90)
      (drawTOP_ROT90 curX cncY0 wysTOP szerTOP unitNum gruboscPlyty)
      (setq curX (+ curX wysTOP odstep))
      
      ;; 4. BOTTOM (COMMON - rotated 90)
      (drawBOTTOM_ROT90 curX cncY0 wysTOP szerTOP unitNum gruboscPlyty)
      (setq curX (+ curX wysTOP odstep))
      
      ;; 5. BACK (COMMON)
      (drawBACK curX cncY0 szerBACK wysBACK unitNum gruboscPlyty)
      (setq curX (+ curX szerBACK odstep))
      
      ;; Drawer side heights
      (setq wysSIDE1 (fix (+ (* wysFRONT1 0.70) 0.5)))
      (setq wysSIDE2 (fix (+ (* wysFRONT2 0.70) 0.5)))
      (setq wysSIDE3 (fix (+ (* wysFRONT3 0.70) 0.5)))
      
      ;; 6-7. Drawer 1 sides
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE1 unitNum 1 1 gruboscPlyty)
      (setq curX (+ curX wysSIDE1 odstep))
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE1 unitNum 1 2 gruboscPlyty)
      (setq curX (+ curX wysSIDE1 odstep))
      
      ;; 8-9. Drawer 2 sides
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE2 unitNum 2 1 gruboscPlyty)
      (setq curX (+ curX wysSIDE2 odstep))
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE2 unitNum 2 2 gruboscPlyty)
      (setq curX (+ curX wysSIDE2 odstep))
      
      ;; 10-11. Drawer 3 sides
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE3 unitNum 3 1 gruboscPlyty)
      (setq curX (+ curX wysSIDE3 odstep))
      (drawDRAWER_SIDE curX cncY0 szufDl wysSIDE3 unitNum 3 2 gruboscPlyty)
      (setq curX (+ curX wysSIDE3 odstep))
      
      ;; Box front dimensions
      (setq dlBoxFront (- szerSzafki (* 4.0 gruboscPlyty) 10.0))
      (setq wysBoxFront1 (- wysSIDE1 15.0 gruboscPlyty 1.0))
      (setq wysBoxFront2 (- wysSIDE2 15.0 gruboscPlyty 1.0))
      (setq wysBoxFront3 (- wysSIDE3 15.0 gruboscPlyty 1.0))
      
      ;; 12-13. Drawer 1 box front/back
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront1 unitNum 1 T)
      (setq curX (+ curX wysBoxFront1 odstep))
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront1 unitNum 1 nil)
      (setq curX (+ curX wysBoxFront1 odstep))
      
      ;; 14-15. Drawer 2 box front/back
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront2 unitNum 2 T)
      (setq curX (+ curX wysBoxFront2 odstep))
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront2 unitNum 2 nil)
      (setq curX (+ curX wysBoxFront2 odstep))
      
      ;; 16-17. Drawer 3 box front/back
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront3 unitNum 3 T)
      (setq curX (+ curX wysBoxFront3 odstep))
      (drawDRAWER_BOX_FRONT curX cncY0 dlBoxFront wysBoxFront3 unitNum 3 nil)
      (setq curX (+ curX wysBoxFront3 odstep))
      
      ;; Drawer bottoms
      (setq szerDno (+ dlBoxFront 13.0))
      (setq dlDno szufDl)
      
      ;; 18-20. Drawer bottoms
      (drawDRAWER_BOTTOM curX cncY0 szerDno dlDno unitNum 1)
      (setq curX (+ curX szerDno odstep))
      (drawDRAWER_BOTTOM curX cncY0 szerDno dlDno unitNum 2)
      (setq curX (+ curX szerDno odstep))
      (drawDRAWER_BOTTOM curX cncY0 szerDno dlDno unitNum 3)
      (setq curX (+ curX szerDno odstep))
      
      ;; DRAWER FRONTS (magenta) - stacked vertically
      (setq curX (+ curX 100.0))
      (drawDRAWER_FRONT curX cncY0 szerFRONT wysFRONT1 unitNum 1 gruboscPlyty)
      (drawDRAWER_FRONT curX (+ cncY0 wysFRONT1 3.0) szerFRONT wysFRONT2 unitNum 2 gruboscPlyty)
      (drawDRAWER_FRONT curX (+ cncY0 wysFRONT1 3.0 wysFRONT2 3.0) szerFRONT wysFRONT3 unitNum 3 gruboscPlyty)
      (setq curX (+ curX szerFRONT odstep))
      
      ;;;========================================
      ;;; SUMMARY
      ;;;========================================
      (setq summaryX (+ curX 500.0))
      (setq summaryY (+ cncY0 wysBUL))
      (setq lineH 18.0)
      
      (drawTextL "SUMMARY" summaryX summaryY 14.0 (strcat "UNIT: " unitNum " (DRAWER)"))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 "---------")
      (setq summaryY (- summaryY lineH))
      
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "Cabinet: " (rtos szerSzafki 2 0) " x " (rtos glSzafki 2 0) " x " (rtos wysSzafki 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "Board: " (rtos gruboscPlyty 2 0) "mm  Front: " (rtos gruboscDrzwi 2 0) "mm (" doorType ")"))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "Drawer depth: " (rtos szufDl 2 0) "mm (max " (rtos maxDl 2 0) "mm)"))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 "---------")
      (setq summaryY (- summaryY lineH))
      
      ;; Carcase panels 1-5
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "1. BUL: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "2. BUR: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "3. TOP: " (rtos wysTOP 2 0) " x " (rtos szerTOP 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "4. BOTTOM: " (rtos wysTOP 2 0) " x " (rtos szerTOP 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "5. BACK: " (rtos szerBACK 2 0) " x " (rtos wysBACK 2 0)))
      (setq summaryY (- summaryY lineH))
      
      ;; Drawer D1 (6-10)
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "6-7. " unitNum "-D1 SIDE x2: " (rtos szufDl 2 0) " x " (rtos wysSIDE1 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "8-9. " unitNum "-D1 F/B x2: " (rtos dlBoxFront 2 0) " x " (rtos wysBoxFront1 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "10. " unitNum "-D1 BTM: " (rtos szerDno 2 0) " x " (rtos dlDno 2 0)))
      (setq summaryY (- summaryY lineH))
      
      ;; Drawer D2 (11-15)
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "11-12. " unitNum "-D2 SIDE x2: " (rtos szufDl 2 0) " x " (rtos wysSIDE2 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "13-14. " unitNum "-D2 F/B x2: " (rtos dlBoxFront 2 0) " x " (rtos wysBoxFront2 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "15. " unitNum "-D2 BTM: " (rtos szerDno 2 0) " x " (rtos dlDno 2 0)))
      (setq summaryY (- summaryY lineH))
      
      ;; Drawer D3 (16-20)
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "16-17. " unitNum "-D3 SIDE x2: " (rtos szufDl 2 0) " x " (rtos wysSIDE3 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "18-19. " unitNum "-D3 F/B x2: " (rtos dlBoxFront 2 0) " x " (rtos wysBoxFront3 2 0)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "20. " unitNum "-D3 BTM: " (rtos szerDno 2 0) " x " (rtos dlDno 2 0)))
      (setq summaryY (- summaryY lineH))
      
      (drawTextL "SUMMARY" summaryX summaryY 12.0 "---------")
      (setq summaryY (- summaryY lineH))
      
      ;; Totals
      (setq totalPanels 20)
      (setq totalSQM (/ (+ (* szerBUL wysBUL 2.0) (* szerTOP wysTOP 2.0) (* szerBACK wysBACK)
                           (* szufDl wysSIDE1 2.0) (* szufDl wysSIDE2 2.0) (* szufDl wysSIDE3 2.0)
                           (* dlBoxFront wysBoxFront1 2.0) (* dlBoxFront wysBoxFront2 2.0) (* dlBoxFront wysBoxFront3 2.0)
                           (* szerDno dlDno 3.0)) 1000000.0))
      (setq totalEdging (/ (+ (* wysBUL 2.0) (* szerFRONT 3.0) wysFRONT1 wysFRONT2 wysFRONT3
                              wysFRONT1 wysFRONT2 wysFRONT3
                              (* (+ (* szufDl 2.0) (* dlBoxFront 2.0)) 3.0)) 1000.0))
      
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "PANELS: " (itoa totalPanels)))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "SQM: " (rtos totalSQM 2 2) " m2"))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 (strcat "EDGING: " (rtos totalEdging 2 2) " m"))
      (setq summaryY (- summaryY lineH))
      (drawTextL "SUMMARY" summaryX summaryY 12.0 "---------")
      (setq summaryY (- summaryY (* lineH 6.0)))
      
      ;; FRONTS section (magenta)
      (drawTextLC "SUMMARY" summaryX summaryY 14.0 "FRONTS (MAGENTA)" 6)
      (setq summaryY (- summaryY lineH))
      (drawTextLC "SUMMARY" summaryX summaryY 12.0 (strcat "1. " unitNum "-F1: " (rtos szerFRONT 2 0) " x " (rtos wysFRONT1 2 0)) 6)
      (setq summaryY (- summaryY lineH))
      (drawTextLC "SUMMARY" summaryX summaryY 12.0 (strcat "2. " unitNum "-F2: " (rtos szerFRONT 2 0) " x " (rtos wysFRONT2 2 0)) 6)
      (setq summaryY (- summaryY lineH))
      (drawTextLC "SUMMARY" summaryX summaryY 12.0 (strcat "3. " unitNum "-F3: " (rtos szerFRONT 2 0) " x " (rtos wysFRONT3 2 0)) 6)
      (setq summaryY (- summaryY lineH))
      (drawTextLC "SUMMARY" summaryX summaryY 12.0 "---------" 6)
      (setq summaryY (- summaryY lineH))
      
      ;; Property line (red)
      (drawTextLC "SUMMARY" summaryX summaryY 10.0 "Property of Skylon Joinery" 1)
    )))) ;; closes: getpoint progn, cncPt if, drawCNC if, main progn
  
  ;;;========================================
  ;;; LABELS CSV
  ;;;========================================
  (if szerBUL
    (progn
      (setq csvPath (findfile "KIT_BUDR_FULL.lsp"))
      (if csvPath
        (setq csvPath (strcat (vl-filename-directory csvPath) "\\SKYLON_labels.csv"))
        (progn
          (setq csvPath (getvar "DWGPREFIX"))
          (if (= csvPath "") (setq csvPath (strcat (getenv "USERPROFILE") "\\Desktop\\")))
          (setq csvPath (strcat csvPath "SKYLON_labels.csv"))))
      (if (findfile csvPath)
        (setq csvFile (open csvPath "a"))
        (progn
          (setq csvFile (open csvPath "w"))
          (if csvFile (write-line "UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM" csvFile))))
      (if csvFile
        (progn
          (write-line (strcat unitNum ",BUL," (rtos szerBUL 2 0) "," (rtos wysBUL 2 0) ",<,"
            (rtos (/ wysBUL 1000.0) 2 2) "," (rtos (/ (* szerBUL wysBUL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BUR," (rtos szerBUL 2 0) "," (rtos wysBUL 2 0) ",>,"
            (rtos (/ wysBUL 1000.0) 2 2) "," (rtos (/ (* szerBUL wysBUL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",TOP," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BOTTOM," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BACK," (rtos szerBACK 2 0) "," (rtos wysBACK 2 0) ",,0,"
            (rtos (/ (* szerBACK wysBACK) 1000000.0) 2 3)) csvFile)
          ;; Drawer sides (6x)
          (write-line (strcat unitNum ",D1-SL," (rtos szufDl 2 0) "," (rtos wysSIDE1 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE1) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D1-SR," (rtos szufDl 2 0) "," (rtos wysSIDE1 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE1) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D2-SL," (rtos szufDl 2 0) "," (rtos wysSIDE2 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE2) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D2-SR," (rtos szufDl 2 0) "," (rtos wysSIDE2 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE2) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D3-SL," (rtos szufDl 2 0) "," (rtos wysSIDE3 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE3) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D3-SR," (rtos szufDl 2 0) "," (rtos wysSIDE3 2 0) ",,0,"
            (rtos (/ (* szufDl wysSIDE3) 1000000.0) 2 3)) csvFile)
          ;; Drawer box fronts/backs (6x)
          (write-line (strcat unitNum ",D1-BF," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront1 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront1) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D1-BB," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront1 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront1) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D2-BF," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront2 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront2) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D2-BB," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront2 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront2) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D3-BF," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront3 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront3) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D3-BB," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront3 2 0) ",,0,"
            (rtos (/ (* dlBoxFront wysBoxFront3) 1000000.0) 2 3)) csvFile)
          ;; Drawer bottoms (3x)
          (write-line (strcat unitNum ",D1-DNO," (rtos szerDno 2 0) "," (rtos dlDno 2 0) ",,0,"
            (rtos (/ (* szerDno dlDno) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D2-DNO," (rtos szerDno 2 0) "," (rtos dlDno 2 0) ",,0,"
            (rtos (/ (* szerDno dlDno) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",D3-DNO," (rtos szerDno 2 0) "," (rtos dlDno 2 0) ",,0,"
            (rtos (/ (* szerDno dlDno) 1000000.0) 2 3)) csvFile)
          ;; Drawer fronts (3x, all 4 edges)
          (write-line (strcat unitNum "," unitNum "-F1," (rtos szerFRONT 2 0) "," (rtos wysFRONT1 2 0) ",<>^v,"
            (rtos (/ (+ (* 2.0 szerFRONT) (* 2.0 wysFRONT1)) 1000.0) 2 2) "," (rtos (/ (* szerFRONT wysFRONT1) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum "," unitNum "-F2," (rtos szerFRONT 2 0) "," (rtos wysFRONT2 2 0) ",<>^v,"
            (rtos (/ (+ (* 2.0 szerFRONT) (* 2.0 wysFRONT2)) 1000.0) 2 2) "," (rtos (/ (* szerFRONT wysFRONT2) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum "," unitNum "-F3," (rtos szerFRONT 2 0) "," (rtos wysFRONT3 2 0) ",<>^v,"
            (rtos (/ (+ (* 2.0 szerFRONT) (* 2.0 wysFRONT3)) 1000.0) 2 2) "," (rtos (/ (* szerFRONT wysFRONT3) 1000000.0) 2 3)) csvFile)
          (close csvFile)
          (princ (strcat "\nLabels appended to: " csvPath)))
        (princ "\nERROR: Cannot open labels CSV file."))))
  
  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  
  (princ (strcat "\nBUDR_FULL " unitNum " - Done! (3 drawers, " (rtos szufDl 2 0) "mm depth)"))
  (princ (strcat "\n  Front heights: " (rtos wysFRONT1 2 0) " / " (rtos wysFRONT2 2 0) " / " (rtos wysFRONT3 2 0) " (4:3:2 ratio)"))
  (if (= drawCNC "Y") (princ "\n  CNC panels drawn at selected point"))
  (princ))

(princ "\nKIT_BUDR_FULL loaded. Type BUDR_FULL to run.")