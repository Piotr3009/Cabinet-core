;;;========================================
;;; KIT_SASH_STANDARD.lsp
;;; Sash Window - Standard Frame (164mm)
;;; Command: SASH_STD
;;; Version 1.0
;;; Skylon Timber & Glazing
;;;========================================

;;; Load dependencies
(if (null sw:calcDims) (load "SKYLON_WINDOWS_COMMON"))

;;;========================================
;;; MAIN COMMAND
;;;========================================

(defun c:SASH_STD ( / dcl_id result
  sw_ref sw_ral sw_fw sw_fh sw_opening sw_bars sw_horns
  openType barPattern dims pt csvPath spacing)

  ;; Load DCL
  (setq dcl_id (load_dialog "skylon_windows.dcl"))
  (if (< dcl_id 0)
    (progn
      (alert "Error: Cannot load skylon_windows.dcl\nMake sure file is in AutoCAD support path.")
      (exit)))

  ;; Show dialog
  (if (not (new_dialog "skylon_sash_config" dcl_id))
    (progn
      (alert "Error: Cannot open sash config dialog")
      (unload_dialog dcl_id)
      (exit)))

  ;; Set up Calculate button callback
  (action_tile "btn_calc" "(sash_update_calc)")
  (action_tile "edt_width" "(sash_update_calc)")
  (action_tile "edt_height" "(sash_update_calc)")

  ;; Set up OK/Cancel
  (action_tile "accept"
    (strcat
      "(setq sw_ref (get_tile \"edt_ref\"))"
      "(setq sw_ral (get_tile \"edt_ral\"))"
      "(setq sw_fw (atof (get_tile \"edt_width\")))"
      "(setq sw_fh (atof (get_tile \"edt_height\")))"
      "(setq sw_opening (get_tile \"pop_opening\"))"
      "(setq sw_bars (get_tile \"pop_bars\"))"
      "(setq sw_horns (atoi (get_tile \"tgl_horns\")))"
      "(done_dialog 1)"))

  (action_tile "cancel" "(done_dialog 0)")

  ;; Initial calculation
  (sash_update_calc)

  ;; Run dialog
  (setq result (start_dialog))
  (unload_dialog dcl_id)

  ;; If user clicked DRAW
  (if (= result 1)
    (progn
      ;; Validate
      (if (or (<= sw_fw 0) (<= sw_fh 0))
        (progn (alert "Invalid dimensions!") (exit)))

      ;; Map popup values to strings
      (setq openType
        (cond
          ((= sw_opening "0") "both")
          ((= sw_opening "1") "bottom")
          ((= sw_opening "2") "fixed")
          (T "both")))

      (setq barPattern
        (cond
          ((= sw_bars "0") "none")
          ((= sw_bars "1") "2x2")
          ((= sw_bars "2") "3x3")
          ((= sw_bars "3") "4x4")
          ((= sw_bars "4") "6x6")
          ((= sw_bars "5") "9x9")
          ((= sw_bars "6") "1vert")
          ((= sw_bars "7") "2vert")
          (T "none")))

      ;; Calculate dimensions
      (setq dims (sw:calcDims sw_fw sw_fh))

      ;; Create layers
      (sw:makeLayers)

      ;; Ask for insertion point
      (setq pt (getpoint "\nSelect insertion point for window drawing: "))
      (if (null pt) (exit))

      ;; Spacing between front and back views
      (setq spacing 200)

      ;; Draw FRONT elevation
      (princ "\nDrawing front elevation...")
      (sw:drawFrontElevation
        (car pt) (cadr pt)
        dims openType sw_horns barPattern sw_ref sw_ral)

      ;; Draw BACK elevation (offset to the right)
      (princ "\nDrawing back elevation...")
      (sw:drawBackElevation
        (+ (car pt) sw_fw spacing) (cadr pt)
        dims openType barPattern sw_ref)

      ;; RAL text under both
      (sw:drawText "SW-TEXT"
        (+ (car pt) sw_fw (/ spacing 2.0))
        (- (cadr pt) 130) 35
        (strcat sw_ral " E/I"))

      ;; Append to CSV
      (setq csvPath (strcat (getvar "DWGPREFIX") "sash_windows.csv"))
      (sw:appendCSV csvPath sw_ref sw_fw sw_fh dims openType sw_horns barPattern sw_ral)

      (princ (strcat "\nSash window " sw_ref " drawn successfully."))
    )
  )
  (princ)
)

;;;========================================
;;; DIALOG HELPER - Update calculations
;;;========================================

(defun sash_update_calc ( / fw fh dims sw_val tsh bsh gw gh)
  (setq fw (atof (get_tile "edt_width")))
  (setq fh (atof (get_tile "edt_height")))

  (if (and (> fw 0) (> fh 0))
    (progn
      (setq dims (sw:calcDims fw fh))
      (setq sw_val (sw:getD dims "sash_w"))
      (setq tsh (sw:getD dims "top_sash_h"))
      (setq bsh (sw:getD dims "bot_sash_h"))
      (setq gw  (sw:getD dims "glass_w"))
      (setq gh  (sw:getD dims "glass_h"))

      (set_tile "txt_sash_w"
        (strcat "Sash Width: " (itoa (fix sw_val)) " mm"))
      (set_tile "txt_sash_h_top"
        (strcat "Top Sash Height: " (itoa (fix tsh)) " mm"))
      (set_tile "txt_sash_h_bot"
        (strcat "Bottom Sash Height: " (itoa (fix bsh)) " mm"))
      (set_tile "txt_glass"
        (strcat "Glass: " (itoa (fix gw)) " x " (itoa (fix gh)) " mm"))
    )
  )
)

(princ "\nKIT_SASH_STANDARD v1.0 loaded. Command: SASH_STD")
(princ)
