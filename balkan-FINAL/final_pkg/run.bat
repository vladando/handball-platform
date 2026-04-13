@echo off
echo =============================================
echo  Balkanski Narrativni Analiticar
echo =============================================
echo.
echo [1/2] Instalacija biblioteka...
pip install -r requirements.txt
echo.
echo [2/2] Pokretanje dashboarda...
echo.
echo Otvori browser: http://localhost:8501
echo Zaustavi: Ctrl+C
echo.
streamlit run app.py --theme.base dark --theme.primaryColor "#3B7FF5" --theme.backgroundColor "#0A0C10" --theme.secondaryBackgroundColor "#0F1218" --theme.textColor "#E8EDF5"
