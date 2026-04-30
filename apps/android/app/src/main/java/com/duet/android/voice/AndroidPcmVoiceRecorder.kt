package com.duet.android.voice

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

class AndroidPcmVoiceRecorder(
    val file: File,
    private val onLevels: (List<Float>) -> Unit
) {
    val filename: String = VOICE_WAV_FILENAME
    val mimeType: String = VOICE_WAV_MIME_TYPE

    private val lock = Any()
    private var recorder: AudioRecord? = null
    private var output: FileOutputStream? = null
    private var thread: Thread? = null
    @Volatile private var running = false
    @Volatile private var pcmBytesWritten = 0

    @SuppressLint("MissingPermission")
    fun start() {
        val minBufferBytes = AudioRecord.getMinBufferSize(
            VOICE_SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        require(minBufferBytes > 0) { "PCM voice recording is not supported on this device" }

        val bufferBytes = max(minBufferBytes, (VOICE_SAMPLE_RATE_HZ / 10) * 2)
        val audioFormat = AudioFormat.Builder()
            .setSampleRate(VOICE_SAMPLE_RATE_HZ)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .build()
        val audioRecord = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(audioFormat)
            .setBufferSizeInBytes(bufferBytes)
            .build()

        if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
            audioRecord.release()
            error("PCM voice recorder failed to initialize")
        }

        val stream = FileOutputStream(file)
        stream.write(createWavHeader(0))

        recorder = audioRecord
        output = stream
        running = true
        pcmBytesWritten = 0

        try {
            audioRecord.startRecording()
        } catch (error: Throwable) {
            running = false
            stream.close()
            audioRecord.release()
            recorder = null
            output = null
            throw error
        }

        val buffer = ShortArray(bufferBytes / 2)
        thread = Thread({
            while (running) {
                val read = audioRecord.read(buffer, 0, buffer.size, AudioRecord.READ_BLOCKING)
                if (read > 0) {
                    synchronized(lock) {
                        output?.let { stream ->
                            writePcm16LittleEndian(stream, buffer, read)
                            pcmBytesWritten += read * 2
                        }
                    }
                    onLevels(buildPcmVoiceLevels(buffer, read))
                }
            }
        }, "duet-pcm-voice-recorder").apply { start() }
    }

    fun stop() {
        running = false
        val audioRecord = recorder
        runCatching { audioRecord?.stop() }
        runCatching { thread?.join(700) }
        synchronized(lock) {
            runCatching { output?.flush() }
            runCatching { output?.close() }
            output = null
        }
        runCatching { audioRecord?.release() }
        recorder = null
        thread = null
        rewriteWavHeader(file, pcmBytesWritten)
    }

    fun release() {
        running = false
        runCatching { recorder?.stop() }
        runCatching { recorder?.release() }
        runCatching { output?.close() }
        recorder = null
        output = null
        thread = null
    }
}
